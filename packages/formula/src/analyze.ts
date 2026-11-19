import type { ConstantNode, FunctionAssignmentNode, FunctionNode, MathNode, OperatorNode } from 'mathjs';
import type { FormulaEngine } from './engine';
import type { Analysis, Diagnostic, DiagnosticCode, FormulaContext, FormulaSource, FormulaValueType, FormulaVariable, Reference, Token } from './types';
import { isListInScope, scanItemScopes } from './itemScope';
import { normalizeFormula, stringValue, tokenize } from './lexer';
import { dotProperty } from './mathNodes';

/** The functions of mathjs that compare their arguments as text. */
const TEXT_COMPARISON_FUNCTIONS = ['equalText', 'compareText', 'compareNatural'];

const BOOLEAN_FUNCTIONS = [
  'equal',
  'unequal',
  'larger',
  'smaller',
  'largerEq',
  'smallerEq',
  'equalText',
  'deepEqual',
  'and',
  'or',
  'not',
  'xor',
  'isNaN',
  'isZero',
  'isPositive',
  'isNegative',
  'isInteger',
  'isPrime',
  'isNumeric',
  'hasNumericValue',
];
const NUMBER_FUNCTIONS = [
  'add',
  'subtract',
  'multiply',
  'divide',
  'pow',
  'mod',
  'unaryMinus',
  'unaryPlus',
  'abs',
  'ceil',
  'floor',
  'round',
  'fix',
  'sqrt',
  'cbrt',
  'exp',
  'log',
  'log10',
  'log2',
  'sum',
  'prod',
  'mean',
  'median',
  'min',
  'max',
  'count',
  'number',
  'sign',
  'compareText',
  'compareNatural',
  'compare',
  'random',
  'randomInt',
  'std',
  'variance',
];
const LIST_FUNCTIONS = [
  'map',
  'filter',
  'sort',
  'concat',
  'flatten',
  'range',
];
const STRING_FUNCTIONS = ['string', 'format'];
const COMPARISON_OPERATORS = ['==', '!=', '<', '>', '<=', '>='];

type TextComparability = 'text' | 'not-text' | 'unknown';

function textComparability(type: FormulaValueType | undefined): TextComparability {
  if (type === 'string' || type === 'date') {
    return 'text';
  }
  if (type === 'number' || type === 'boolean' || type === 'list' || type === 'object') {
    return 'not-text';
  }
  return 'unknown';
}

function isCompatible(inferred: FormulaValueType, expected: string): boolean {
  return inferred === expected
    || (inferred === 'string' && expected === 'date')
    || (inferred === 'date' && expected === 'string');
}

export function analyzeFormula(engine: FormulaEngine, formula: string, context: FormulaContext, sources: ReadonlyArray<FormulaSource>): Analysis {
  const { math, prefix, itemSuffix } = engine;
  const tokens = tokenize(formula);
  const variables = context.variables ?? [];
  const byName = new Map<string, FormulaVariable>();
  const withChildren = new Set<string>();
  const sourcesOfRoot = new Map<string, Set<string>>();
  for (const variable of variables) {
    if (!byName.has(variable.name)) {
      byName.set(variable.name, variable);
    }
    const segments = variable.name.split('.');
    segments.slice(0, -1).forEach((_, index) => withChildren.add(segments.slice(0, index + 1).join('.')));
    // the item variables of lists (e.g. `list_item`) are only in scope of their list, so they don't collide with other sources
    if (segments.length === 1 && variable.sourceId && !variable.itemOf) {
      sourcesOfRoot.set(variable.name, new Set([
        ...(sourcesOfRoot.get(variable.name) ?? []),
        variable.sourceId,
      ]));
    }
  }
  const customFunctions = engine.functions(sources);

  const diagnostics: Diagnostic[] = [];
  const add = (code: DiagnosticCode, severity: Diagnostic['severity'], range: { from: number; to: number }, params: Diagnostic['params']) => {
    diagnostics.push({
      code,
      severity,
      from: range.from,
      to: range.to,
      params,
    });
  };
  const meaningful = tokens.filter(token => token.type !== 'whitespace' && token.type !== 'comment');
  const wholeRange = {
    from: meaningful[0]?.from ?? 0,
    to: meaningful.at(-1)?.to ?? formula.length,
  };
  const rangesOf = (type: Token['type'], matches: (token: Token) => boolean) => tokens.filter(token => token.type === type && matches(token));
  const addForEach = (ranges: { from: number; to: number }[], code: DiagnosticCode, severity: Diagnostic['severity'], params: Diagnostic['params']) => {
    (ranges.length
      ? ranges
      : [wholeRange]).forEach(range => add(code, severity, range, params));
  };

  const compiled = engine.compile(formula);
  let ast: MathNode | undefined;
  if (compiled.ok) {
    ast = compiled.ast;
  }
  else if (compiled.error.code === 'syntax') {
    const char = (compiled.error.cause as { char?: unknown } | undefined)?.char;
    const from = typeof char === 'number'
      ? Math.min(Math.max(char - 1, 0), Math.max(formula.length - 1, 0))
      : wholeRange.from;
    add('syntax', 'error', { from, to: from + 1 }, { message: compiled.error.message });
  }
  else if (compiled.error.code === 'statements') {
    add('statements', 'error', wholeRange, {});
    // the statements are still checked on their own
    ast = math.parse(normalizeFormula(formula));
  }

  // names that are defined in the formula itself, e.g. `f(x) = x * 2` or the item of a `map` callback
  const parameters = new Set<string>();
  const localFunctions = new Set<string>();
  const assigned = new Set<string>();
  ast?.traverse((node) => {
    if (math.isFunctionAssignmentNode(node)) {
      localFunctions.add(node.name);
      (node as FunctionAssignmentNode).params.forEach(parameter => parameters.add(parameter));
    }
    else if (math.isAssignmentNode(node) && math.isSymbolNode(node.object)) {
      assigned.add(node.object.name);
    }
  });

  // a path below a known variable without described children (e.g. an external object) can't be checked
  const isBelowOpaqueVariable = (name: string) => {
    const segments = name.split('.');
    for (let length = segments.length - 1; length > 0; length--) {
      const ancestor = segments.slice(0, length).join('.');
      const variable = byName.get(ancestor);
      if (variable) {
        return !withChildren.has(ancestor) && (variable.type === 'object' || variable.type === 'unknown' || variable.type === undefined);
      }
    }
    return false;
  };

  const references: Reference[] = [];
  for (const { token, lists } of scanItemScopes(tokens, prefix, context.loopScopes).variables) {
    const name = token.text.slice(prefix.length);
    const root = name.split('.')[0]!;
    const variable = byName.get(name);
    const range = { from: token.from, to: token.to };
    if (parameters.has(`${prefix}${root}`) || assigned.has(`${prefix}${root}`)) {
      if (variable) {
        references.push({ name, ...range, variable });
      }
      continue;
    }
    references.push({
      name,
      ...range,
      ...(variable
        ? { variable }
        : {}),
    });
    if (!ast) {
      continue;
    }
    if (!variable && !isBelowOpaqueVariable(name)) {
      add('unknown-variable', 'error', range, { name });
      continue;
    }
    if (root.endsWith(itemSuffix) && root.length > itemSuffix.length) {
      const list = root.slice(0, -itemSuffix.length);
      if (!isListInScope(list, lists)) {
        add('out-of-scope', 'error', range, { name, list });
      }
    }
    if (context.self && (name === context.self || name.startsWith(`${context.self}.`))) {
      add('self-reference', 'warning', range, { name });
    }
    const rootSources = sourcesOfRoot.get(root);
    if (rootSources && rootSources.size > 1) {
      add('ambiguous-variable', 'warning', range, {
        name: root,
        sources: [...rootSources],
      });
    }
  }

  const pathOf = (node: MathNode): string | undefined => {
    if (math.isParenthesisNode(node)) {
      return pathOf(node.content);
    }
    if (math.isSymbolNode(node)) {
      return node.name;
    }
    if (math.isAccessorNode(node) && node.index.dotNotation) {
      const object = pathOf(node.object);
      return object === undefined
        ? undefined
        : `${object}.${dotProperty(node.index)}`;
    }
    return undefined;
  };
  const variableOf = (node: MathNode) => {
    const path = pathOf(node);
    return path?.startsWith(prefix)
      ? byName.get(path.slice(prefix.length))
      : undefined;
  };
  const stringLiteral = (node: MathNode): string | undefined => {
    const unwrapped = math.isParenthesisNode(node)
      ? node.content
      : node;
    const value: unknown = math.isConstantNode(unwrapped)
      ? (unwrapped as ConstantNode).value
      : undefined;
    return typeof value === 'string'
      ? value
      : undefined;
  };
  const variableTokens = (variable: FormulaVariable) => rangesOf('variable', token => token.text === `${prefix}${variable.name}`);
  const stringTokens = (literal: string) => rangesOf('string', token => stringValue(token) === literal);

  // checks an argument of a text comparison, which may have a fallback (`$field ?? 'text'`), against the other argument
  const checkTextComparison = (argument: MathNode, other: MathNode) => {
    const unwrapped = math.isParenthesisNode(argument)
      ? argument.content
      : argument;
    const isFallback = math.isOperatorNode(unwrapped) && (unwrapped.op as string) === '??';
    const variable = variableOf(isFallback
      ? unwrapped.args[0]!
      : unwrapped);
    if (!variable) {
      return;
    }
    const comparability = textComparability(variable.type);
    if (comparability === 'not-text') {
      addForEach(variableTokens(variable), 'not-text-comparable', 'error', { name: variable.name, type: variable.type });
      return;
    }
    const options = variable.options?.map(option => option.value) ?? [];
    if (!options.length) {
      return;
    }
    const literals = [
      stringLiteral(other),
      isFallback
        ? stringLiteral(unwrapped.args[1]!) || undefined
        : undefined,
    ].filter(literal => literal !== undefined);
    for (const literal of literals) {
      if (!options.includes(literal)) {
        addForEach(stringTokens(literal), 'unknown-option', 'error', { name: variable.name, literal, options });
      }
    }
  };

  ast?.traverse((node, _path, parent) => {
    if (math.isSymbolNode(node)) {
      const { name } = node;
      const isCalled = !!parent && math.isFunctionNode(parent) && (parent as FunctionNode).fn === node;
      const isAssigned = !!parent && math.isAssignmentNode(parent) && parent.object === node;
      if (isCalled || isAssigned || name.startsWith(prefix) || parameters.has(name) || assigned.has(name) || localFunctions.has(name)) {
        return;
      }
      const ranges = rangesOf('identifier', token => token.text === name);
      if (engine.isDisabledFunction(name)) {
        addForEach(ranges, 'disabled-function', 'error', { name });
      }
      else if (!(name in math) && !customFunctions[name]) {
        addForEach(ranges, 'unknown-variable', 'error', { name, prefix });
      }
      return;
    }
    if (math.isFunctionNode(node) && math.isSymbolNode(node.fn)) {
      const { name } = node.fn;
      const ranges = rangesOf('identifier', token => token.text === name);
      if (name.startsWith(prefix) || parameters.has(name) || localFunctions.has(name)) {
        return;
      }
      if (engine.isDisabledFunction(name)) {
        addForEach(ranges, 'disabled-function', 'error', { name });
      }
      else if (typeof (math as unknown as Record<string, unknown>)[name] !== 'function' && !customFunctions[name]) {
        addForEach(ranges, 'unknown-function', 'error', { name });
      }
      else if (TEXT_COMPARISON_FUNCTIONS.includes(name) && node.args.length === 2) {
        checkTextComparison(node.args[0]!, node.args[1]!);
        checkTextComparison(node.args[1]!, node.args[0]!);
      }
      return;
    }
    // `==` and `!=` compare numbers, a text which isn't a number fails when the formula is evaluated
    if (math.isOperatorNode(node) && (node.op === '==' || node.op === '!=')) {
      for (const argument of node.args) {
        const literal = stringLiteral(argument);
        if (literal !== undefined && Number.isNaN(Number(literal))) {
          addForEach(stringTokens(literal), 'compare-text-with-equal-text', 'error', { literal, operator: node.op });
        }
      }
    }
  });

  const inferType = (node: MathNode): FormulaValueType => {
    const combine = (types: FormulaValueType[]) => (types.every(type => type === types[0])
      ? types[0]!
      : 'unknown');
    if (math.isParenthesisNode(node)) {
      return inferType(node.content);
    }
    if (math.isConstantNode(node)) {
      const type = typeof (node as ConstantNode).value;
      return type === 'number' || type === 'string' || type === 'boolean'
        ? type
        : 'unknown';
    }
    if (math.isSymbolNode(node) || math.isAccessorNode(node)) {
      const path = pathOf(node);
      if (path?.startsWith(prefix)) {
        return byName.get(path.slice(prefix.length))?.type ?? 'unknown';
      }
      return path !== undefined && typeof (math as unknown as Record<string, unknown>)[path] === 'number'
        ? 'number'
        : 'unknown';
    }
    if (math.isConditionalNode(node)) {
      return combine([
        inferType(node.trueExpr),
        inferType(node.falseExpr),
      ]);
    }
    if (math.isOperatorNode(node)) {
      const operator = node as OperatorNode;
      if ((operator.op as string) === '??') {
        return combine(operator.args.map(inferType));
      }
      if (COMPARISON_OPERATORS.includes(operator.op) || BOOLEAN_FUNCTIONS.includes(operator.fn)) {
        return 'boolean';
      }
      if (NUMBER_FUNCTIONS.includes(operator.fn)) {
        return operator.args.some(argument => inferType(argument) === 'list')
          ? 'list'
          : 'number';
      }
      return 'unknown';
    }
    if (math.isFunctionNode(node) && math.isSymbolNode(node.fn)) {
      const { name } = node.fn;
      if (BOOLEAN_FUNCTIONS.includes(name)) {
        return 'boolean';
      }
      if (NUMBER_FUNCTIONS.includes(name)) {
        return 'number';
      }
      if (LIST_FUNCTIONS.includes(name)) {
        return 'list';
      }
      if (STRING_FUNCTIONS.includes(name)) {
        return 'string';
      }
    }
    return 'unknown';
  };

  const inferredType = ast && !math.isBlockNode(ast)
    ? inferType(ast)
    : 'unknown';
  if (ast && context.expect && context.expect !== 'any' && inferredType !== 'unknown' && !isCompatible(inferredType, context.expect)) {
    add('type-mismatch', 'warning', wholeRange, { expected: context.expect, actual: inferredType });
  }

  const unique = diagnostics
    .filter((diagnostic, index) => diagnostics.findIndex(other => other.code === diagnostic.code
      && other.from === diagnostic.from
      && other.to === diagnostic.to) === index)
    .sort((a, b) => a.from - b.from);

  return {
    ok: !unique.some(diagnostic => diagnostic.severity === 'error'),
    tokens,
    references,
    diagnostics: unique,
    inferredType,
  };
}
