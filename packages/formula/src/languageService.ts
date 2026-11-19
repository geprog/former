import type { FormulaEngine } from './engine';
import type { FormulaContext, FormulaSource, FormulaVariable, Token } from './types';
import { isListInScope, scanItemScopes } from './itemScope';
import { tokenize } from './lexer';

export type CompletionKind = 'variable' | 'function' | 'constant' | 'keyword' | 'option';

export type CompletionItem = {
  /** Shown in the list, e.g. `$group.field` or `sum`. */
  label: string;
  /** The text replacing the range of the completion. */
  insert: string;
  /** Where the cursor goes within `insert`, by default after it, e.g. between the brackets of a function. */
  cursor?: number;
  kind: CompletionKind;
  /** A short hint next to the label, e.g. the label of a variable or the syntax of a function. */
  detail?: string;
  description?: string;
};

export type Completion = {
  /** The range of the formula the selected item replaces. */
  from: number;
  to: number;
  items: CompletionItem[];
};

/** The documentation of a function or constant of mathjs or of a source. */
export type FunctionDoc = {
  name: string;
  syntax: string[];
  description?: string;
  examples?: string[];
};

export type HoverInfo = {
  from: number;
  to: number;
} & (
  | { kind: 'variable'; variable: FormulaVariable }
  | { kind: 'function' | 'constant'; doc: FunctionDoc }
);

export type SignatureHelp = {
  /** The position of the name of the called function. */
  from: number;
  doc: FunctionDoc;
  /** The index of the argument the position is in. */
  argument: number;
};

export type LanguageServiceOptions = {
  sources?: ReadonlyArray<FormulaSource>;
};

const KEYWORDS = [
  'and',
  'or',
  'not',
  'xor',
  'mod',
  'to',
  'in',
];
const TEXT_COMPARISON_FUNCTIONS = ['equalText', 'compareText', 'compareNatural'];
// documented by mathjs, but not meant to be used in formulas
const HIDDEN_NAMES = [
  'config',
  'typed',
  'chain',
  'help',
  'print',
];

type MathDoc = { name: string; syntax?: string[]; description?: string; examples?: string[] };

// the documented functions and constants of a mathjs instance, which takes a while to collect, so it is done once
const documentedNames = new WeakMap<object, Map<string, MathDoc>>();

function mathDocs(engine: FormulaEngine): Map<string, MathDoc> {
  const { math } = engine;
  let docs = documentedNames.get(math);
  if (!docs) {
    docs = new Map();
    for (const name of Object.keys(math)) {
      if (HIDDEN_NAMES.includes(name) || /^[A-Z]/.test(name)) {
        continue;
      }
      try {
        const { doc } = (math.help as unknown as (name: string) => { doc: MathDoc })(name);
        docs.set(name, doc);
      }
      catch {
        // not documented
      }
    }
    documentedNames.set(math, docs);
  }
  return docs;
}

/** The documentation of a function or constant, of a source or of mathjs, `undefined` for unknown or disabled ones. */
export function functionDoc(engine: FormulaEngine, name: string, options: LanguageServiceOptions = {}): FunctionDoc | undefined {
  const custom = engine.functions(options.sources)[name];
  if (custom) {
    return {
      name,
      syntax: custom.syntax ?? [`${name}(…)`],
      ...(custom.description
        ? { description: custom.description }
        : {}),
      ...(custom.examples
        ? { examples: custom.examples }
        : {}),
    };
  }
  if (engine.isDisabledFunction(name)) {
    return undefined;
  }
  const doc = mathDocs(engine).get(name);
  return doc
    ? {
        name,
        syntax: doc.syntax ?? [],
        ...(doc.description
          ? { description: doc.description }
          : {}),
        ...(doc.examples
          ? { examples: doc.examples }
          : {}),
      }
    : undefined;
}

function isFunction(engine: FormulaEngine, name: string, options: LanguageServiceOptions): boolean {
  return !!engine.functions(options.sources)[name] || typeof (engine.math as unknown as Record<string, unknown>)[name] === 'function';
}

function isMeaningful(token: Token): boolean {
  return token.type !== 'whitespace' && token.type !== 'comment';
}

type Call = { name: Token; argument: number; args: Token[][] };

/** The innermost function call that is open at the token with the given index, e.g. `sum` for `sum(1, |`. */
function enclosingCall(tokens: Token[], index: number): Call | undefined {
  let depth = 0;
  let argument = 0;
  for (let i = index - 1; i >= 0; i--) {
    const token = tokens[i]!;
    if (token.type === 'bracket' && /[)\]}]/.test(token.text)) {
      depth++;
    }
    else if (token.type === 'bracket') {
      if (depth > 0) {
        depth--;
        continue;
      }
      const name = tokens.slice(0, i).filter(isMeaningful).at(-1);
      if (token.text !== '(' || name?.type !== 'identifier') {
        return undefined;
      }
      return {
        name,
        argument,
        args: callArguments(tokens, i),
      };
    }
    else if (depth === 0 && token.type === 'separator' && token.text === ',') {
      argument++;
    }
  }
  return undefined;
}

/** The tokens of each argument of the call whose opening bracket has the given index. */
function callArguments(tokens: Token[], open: number): Token[][] {
  const args: Token[][] = [[]];
  let depth = 0;
  for (const token of tokens.slice(open + 1)) {
    if (token.type === 'bracket' && /[([{]/.test(token.text)) {
      depth++;
    }
    else if (token.type === 'bracket') {
      if (depth === 0) {
        break;
      }
      depth--;
    }
    else if (depth === 0 && token.type === 'separator' && token.text === ',') {
      args.push([]);
      continue;
    }
    args.at(-1)!.push(token);
  }
  return args.map(arg => arg.filter(isMeaningful));
}

function startsWith(text: string, typed: string): boolean {
  return text.toLowerCase().startsWith(typed.toLowerCase());
}

/**
 * What can be inserted at a position of a (possibly half typed) formula: variables after `$`, functions, constants
 * and keywords after letters, and the options of a variable inside the text a text comparison compares it with.
 * Without anything typed, everything is offered when `explicit` (e.g. with Ctrl+Space).
 */
export function complete(
  engine: FormulaEngine,
  text: string,
  offset: number,
  context: FormulaContext = {},
  options: LanguageServiceOptions & { explicit?: boolean } = {},
): Completion | undefined {
  const { prefix } = engine;
  const tokens = tokenize(text);
  const index = tokens.findIndex(token => token.from < offset && offset <= token.to);
  const token = index === -1
    ? undefined
    : tokens[index];
  const variables = context.variables ?? [];
  const lists = scanItemScopes(tokenize(text.slice(0, offset)), prefix, context.loopScopes).listsAtEnd;
  const inScope = (variable: FormulaVariable) => !variable.itemOf || isListInScope(variable.itemOf, lists);

  const variableItem = (variable: FormulaVariable): CompletionItem => ({
    label: `${prefix}${variable.name}`,
    insert: `${prefix}${variable.name}`,
    kind: 'variable',
    ...(variable.label
      ? { detail: variable.label }
      : {}),
    ...(variable.description
      ? { description: variable.description }
      : {}),
  });
  // variables of the expected type first, e.g. checkboxes for a show if condition
  const byExpectedType = (a: FormulaVariable, b: FormulaVariable) => Number(b.type === context.expect) - Number(a.type === context.expect);
  const variableItems = (typed: string) => variables
    .filter(variable => inScope(variable) && startsWith(`${prefix}${variable.name}`, typed))
    .sort(byExpectedType)
    .map(variableItem);

  const nameItems = (typed: string): CompletionItem[] => {
    const names = [
      ...new Set([
        ...mathDocs(engine).keys(),
        ...Object.keys(engine.functions(options.sources)),
      ]),
    ]
      .filter(name => !engine.isDisabledFunction(name) && !KEYWORDS.includes(name) && startsWith(name, typed))
      .sort((a, b) => Number(!a.startsWith(typed)) - Number(!b.startsWith(typed)) || a.localeCompare(b));
    const items = names.map((name): CompletionItem => {
      const doc = functionDoc(engine, name, options);
      if (isFunction(engine, name, options)) {
        return {
          label: name,
          insert: `${name}()`,
          cursor: name.length + 1,
          kind: 'function',
          ...(doc?.syntax[0]
            ? { detail: doc.syntax[0] }
            : {}),
          ...(doc?.description
            ? { description: doc.description }
            : {}),
        };
      }
      return {
        label: name,
        insert: name,
        kind: 'constant',
        ...(doc?.description
          ? { description: doc.description }
          : {}),
      };
    });
    // some keywords are documented as functions as well, e.g. `and`
    const keywords = KEYWORDS.filter(keyword => startsWith(keyword, typed)).map((keyword): CompletionItem => {
      const description = functionDoc(engine, keyword, options)?.description;
      return {
        label: keyword,
        insert: keyword,
        kind: 'keyword',
        ...(description
          ? { description }
          : {}),
      };
    });
    return [
      ...keywords,
      ...items,
    ];
  };

  if (token?.type === 'comment') {
    return undefined;
  }

  // the options of a variable compared as text, e.g. `equalText($choice, '|')`
  if (token?.type === 'string') {
    const closed = token.text.length > 1 && token.text.endsWith(token.text[0]!);
    if (offset === token.to && closed) {
      return undefined;
    }
    const call = enclosingCall(tokens, index);
    if (!call || !TEXT_COMPARISON_FUNCTIONS.includes(call.name.text) || call.args.length !== 2) {
      return undefined;
    }
    const other = call.args[1 - call.argument];
    const variable = other?.length === 1 && other[0]!.type === 'variable'
      ? variables.find(candidate => `${prefix}${candidate.name}` === other[0]!.text)
      : undefined;
    if (!variable?.options?.length) {
      return undefined;
    }
    const typed = text.slice(token.from + 1, offset);
    return {
      from: token.from + 1,
      to: closed
        ? token.to - 1
        : token.to,
      items: variable.options
        .filter(option => startsWith(option.value, typed))
        .map(option => ({
          label: option.value,
          insert: option.value,
          kind: 'option',
          ...(option.label
            ? { detail: option.label }
            : {}),
        })),
    };
  }

  if (token?.type === 'variable') {
    return {
      from: token.from,
      to: token.to,
      items: variableItems(text.slice(token.from, offset)),
    };
  }

  if (token?.type === 'identifier') {
    const typed = text.slice(token.from, offset);
    // a variable may be typed without its prefix, e.g. `field` for `$field`
    return {
      from: token.from,
      to: token.to,
      items: [
        ...variableItems(`${prefix}${typed}`),
        ...nameItems(typed),
      ],
    };
  }

  if (options.explicit) {
    return {
      from: offset,
      to: offset,
      items: [
        ...variableItems(prefix),
        ...nameItems(''),
      ],
    };
  }
  return undefined;
}

/** What is at a position of a formula: a variable with its description, or a function or constant with its documentation. */
export function hover(
  engine: FormulaEngine,
  text: string,
  offset: number,
  context: FormulaContext = {},
  options: LanguageServiceOptions = {},
): HoverInfo | undefined {
  const token = tokenize(text).find(candidate => candidate.from <= offset && offset < candidate.to);
  if (!token) {
    return undefined;
  }
  if (token.type === 'variable') {
    const variable = context.variables?.find(candidate => `${engine.prefix}${candidate.name}` === token.text);
    return variable
      ? {
          from: token.from,
          to: token.to,
          kind: 'variable',
          variable,
        }
      : undefined;
  }
  if (token.type === 'identifier') {
    const doc = functionDoc(engine, token.text, options);
    return doc
      ? {
          from: token.from,
          to: token.to,
          kind: isFunction(engine, token.text, options)
            ? 'function'
            : 'constant',
          doc,
        }
      : undefined;
  }
  return undefined;
}

/** The function whose arguments a position is in, with its documentation and the index of the argument. */
export function signatureHelp(
  engine: FormulaEngine,
  text: string,
  offset: number,
  options: LanguageServiceOptions = {},
): SignatureHelp | undefined {
  const tokens = tokenize(text);
  // the position is after all tokens ending before or at it, e.g. right after the opening bracket
  const index = tokens.findIndex(token => token.to > offset);
  const call = enclosingCall(tokens, index === -1
    ? tokens.length
    : index);
  if (!call) {
    return undefined;
  }
  const doc = functionDoc(engine, call.name.text, options);
  return doc
    ? { from: call.name.from, doc, argument: call.argument }
    : undefined;
}
