import type { EvalFunction, MathJsInstance, MathNode } from 'mathjs';
import type {
  Analysis,
  ComponentsLike,
  EvaluateOptions,
  EvaluationResult,
  ExpectedType,
  FormulaContext,
  FormulaEngineInfo,
  FormulaFunction,
  FormulaSource,
  FormulaVariable,
  SchemaNodeLike,
} from './types';
import type { SchemaVariablesOptions } from './variables';
import { analyzeFormula } from './analyze';
import { normalizeFormula } from './lexer';
import { dotProperty } from './mathNodes';
import { FormulaError } from './types';
import { DEFAULT_ITEM_SUFFIX, schemaVariables } from './variables';

/**
 * Functions that are not available in formulas, as they would allow to break out of the expression
 * (see https://mathjs.org/docs/expressions/security.html) or to change the engine for everyone.
 */
export const UNSAFE_FUNCTIONS = [
  'import',
  'createUnit',
  'reviver',
  'evaluate',
  'parse',
  'compile',
  'parser',
  'simplify',
  'simplifyConstant',
  'simplifyCore',
  'derivative',
  'resolve',
  'rationalize',
  'leafCount',
  'symbolicEqual',
];

export type FormulaEngineOptions = {
  /** The mathjs instance, e.g. `create(all)`. It isn't changed by the engine. */
  math: MathJsInstance;
  /** The character(s) every variable starts with. */
  prefix?: string;
  /** The suffix of the item variable of a list, e.g. `list_item` for the current item of `list`. */
  itemSuffix?: string;
  /** What a variable without value evaluates to, `''` counts as `0` in calculations and is no match in comparisons. */
  missingValue?: unknown;
  /** Functions in addition to the ones of mathjs. */
  functions?: Record<string, FormulaFunction>;
  /** Functions of mathjs that are not available, by default `UNSAFE_FUNCTIONS`. */
  disabledFunctions?: ReadonlyArray<string>;
  /** Sources available to every formula of the engine. */
  sources?: ReadonlyArray<FormulaSource>;
  /** How many compiled formulas are kept. */
  cacheSize?: number;
};

export type CompileResult
  = | { ok: true; ast: MathNode; code: EvalFunction }
    | { ok: false; error: FormulaError };

export type FormulaEngine = FormulaEngineInfo & {
  readonly math: MathJsInstance;
  readonly missingValue: unknown;
  readonly sources: ReadonlyArray<FormulaSource>;
  /** Parses and compiles a formula, the results are cached. */
  compile: (formula: string) => CompileResult;
  /** The value of a formula, or `undefined` if it can't be evaluated or doesn't have the expected type. */
  evaluate: (formula: string, options?: EvaluateOptions) => unknown;
  /** The value of a formula or why it can't be evaluated, and whether a source it used is still pending. */
  evaluateDetailed: (formula: string, options?: EvaluateOptions) => EvaluationResult;
  /** Checks a formula for the place it is used at, without evaluating it. */
  analyze: (formula: string, context?: FormulaContext, options?: { sources?: ReadonlyArray<FormulaSource> }) => Analysis;
  /** The variables of the fields of a schema (see `schemaVariables`), with the `itemSuffix` of the engine. */
  schemaVariables: (schema: ReadonlyArray<SchemaNodeLike>, components: ComponentsLike, options?: Omit<SchemaVariablesOptions, 'itemSuffix'>) => FormulaVariable[];
  /** The variables of the sources of the engine and the given ones. */
  sourceVariables: (sources?: ReadonlyArray<FormulaSource>) => FormulaVariable[];
  /** The first segments of variable names the sources of the engine and the given ones take, which fields mustn't be named. */
  reservedNames: (sources?: ReadonlyArray<FormulaSource>) => string[];
  /** The functions in addition to the ones of mathjs, of the engine and the given sources. */
  functions: (sources?: ReadonlyArray<FormulaSource>) => Record<string, FormulaFunction>;
  isDisabledFunction: (name: string) => boolean;
};

// the accessors of variable paths (e.g. `$group.field`) are compiled to calls of this function, so that a missing
// value anywhere in the path evaluates to the missing value instead of failing, it can't be typed in a formula
const GET = '⁣get';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether an object has a property of its own. Checked with `in` first, which reactive data (e.g. of Vue) tracks,
 * so that a formula is evaluated again when a property it uses is added, unlike `Object.hasOwn` alone.
 */
function hasOwnProperty(object: Record<string, unknown>, key: string): boolean {
  return key in object && Object.hasOwn(object, key);
}

/**
 * A copy of the lists and plain objects of a value, as some functions of mathjs change their arguments (e.g. `sort`
 * sorts a list in place) and assignments write into objects, which mustn't change the data of the form.
 * Objects computing their properties when read (e.g. the namespaces of named formulas) are kept.
 */
function copyValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(copyValue);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some(descriptor => descriptor.get)) {
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    copyValue(entry),
  ]));
}

export function createFormulaEngine(options: FormulaEngineOptions): FormulaEngine {
  const { math } = options;
  const prefix = options.prefix ?? '$';
  const itemSuffix = options.itemSuffix ?? DEFAULT_ITEM_SUFFIX;
  const missingValue = options.missingValue ?? '';
  const disabledFunctions = new Set(options.disabledFunctions ?? UNSAFE_FUNCTIONS);
  const engineSources = options.sources ?? [];
  const cacheSize = options.cacheSize ?? 500;
  const cache = new Map<string, CompileResult>();
  // filled at the end, sources get to see the engine when they describe their variables
  const engine = {} as FormulaEngine;

  // the dot notation path of an accessor of a variable, e.g. `$group.field`
  function pathOf(node: MathNode): string | undefined {
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
  }

  function rewriteAccessors(node: MathNode): MathNode {
    // the target of an assignment stays as it is
    if (math.isAssignmentNode(node)) {
      return new math.AssignmentNode(node.object as any, node.index as any, rewriteAccessors(node.value));
    }
    const mapped = node.map(child => rewriteAccessors(child));
    if (math.isAccessorNode(mapped) && mapped.index.dotNotation) {
      return new math.FunctionNode(new math.SymbolNode(GET), [
        mapped.object,
        new math.ConstantNode(dotProperty(mapped.index)),
        new math.ConstantNode(pathOf(node) ?? ''),
      ]);
    }
    return mapped;
  }

  function compile(formula: string): CompileResult {
    const cached = cache.get(formula);
    if (cached) {
      // keeps the most recently used formulas
      cache.delete(formula);
      cache.set(formula, cached);
      return cached;
    }
    const result = compileUncached(formula);
    cache.set(formula, result);
    if (cache.size > cacheSize) {
      cache.delete(cache.keys().next().value!);
    }
    return result;
  }

  function compileUncached(formula: string): CompileResult {
    const normalized = normalizeFormula(formula);
    if (!normalized.trim()) {
      return {
        ok: false,
        error: new FormulaError('empty', 'The formula is empty'),
      };
    }
    let ast: MathNode;
    try {
      ast = math.parse(normalized);
    }
    catch (error) {
      const formulaError = new FormulaError('syntax', error instanceof Error
        ? error.message
        : String(error), { cause: error });
      return { ok: false, error: formulaError };
    }
    if (math.isBlockNode(ast)) {
      return {
        ok: false,
        error: new FormulaError('statements', 'The formula has more than one statement'),
      };
    }
    try {
      return {
        ok: true,
        ast,
        code: rewriteAccessors(ast).compile(),
      };
    }
    catch (error) {
      return {
        ok: false,
        error: new FormulaError('syntax', String(error), { cause: error }),
      };
    }
  }

  function functions(sources: ReadonlyArray<FormulaSource> = []): Record<string, FormulaFunction> {
    return Object.assign({}, ...[
      ...engineSources,
      ...sources,
    ].map(source => source.functions ?? {}), options.functions ?? {});
  }

  function allSources(sources: ReadonlyArray<FormulaSource> = []): FormulaSource[] {
    return [
      ...sources,
      ...engineSources,
    ];
  }

  function sourceVariables(sources?: ReadonlyArray<FormulaSource>): FormulaVariable[] {
    return allSources(sources).flatMap(source => (source.variables?.(engine) ?? []).map(variable => ({
      sourceId: source.id,
      ...variable,
    })));
  }

  function reservedNames(sources?: ReadonlyArray<FormulaSource>): string[] {
    return [
      ...new Set(allSources(sources).flatMap(source => source.roots())),
    ];
  }

  function convertResult(value: unknown, expect: ExpectedType): unknown {
    let converted = value;
    if (math.isResultSet(converted)) {
      throw new FormulaError('statements', 'The formula has more than one statement');
    }
    if (math.isBigNumber(converted) || math.isFraction(converted)) {
      converted = math.number(converted as any);
    }
    if (math.isMatrix(converted)) {
      converted = converted.toArray();
    }
    const isUnexpected = (() => {
      if (math.isUnit(converted) || math.isComplex(converted) || typeof converted === 'function') {
        return true;
      }
      switch (expect) {
        case 'number':
          return typeof converted !== 'number' || Number.isNaN(converted);
        case 'boolean':
          return typeof converted !== 'boolean';
        case 'string':
          return typeof converted !== 'string';
        case 'date':
          return typeof converted !== 'string' || !ISO_DATE.test(converted);
        default:
          return false;
      }
    })();
    if (isUnexpected) {
      throw new FormulaError('type-mismatch', `The formula doesn't evaluate to ${expect === 'any'
        ? 'a value'
        : `a ${expect}`}`);
    }
    return converted;
  }

  function evaluateDetailed(formula: string, evaluateOptions: EvaluateOptions = {}): EvaluationResult {
    const evaluation = new Evaluation(evaluateOptions);
    try {
      const value = evaluation.evaluate(formula, evaluateOptions.expect ?? 'any');
      return { ok: true, value, pending: evaluation.pending };
    }
    catch (error) {
      const formulaError = error instanceof FormulaError
        ? error
        : new FormulaError('evaluation', error instanceof Error
            ? error.message
            : String(error), { cause: error });
      return { ok: false, error: formulaError, pending: evaluation.pending };
    }
  }

  // the state of one evaluation, shared by the formulas of sources it evaluates (e.g. named formulas)
  class Evaluation {
    pending = false;
    private readonly memo = new Map<string, unknown>();
    private readonly inProgress = new Set<string>();
    private readonly rootData: unknown;
    private readonly items = new Map<string, unknown>();
    private readonly sources: FormulaSource[];
    private readonly builtins = new Map<string, unknown>();
    private sourceByRoot?: Map<string, FormulaSource>;
    private lists?: Set<string>;

    constructor(private readonly evaluateOptions: EvaluateOptions) {
      const scopes = evaluateOptions.scopes ?? [];
      this.rootData = scopes.length
        ? scopes.at(-1)!.data
        : evaluateOptions.data;
      // the scopes of list items (e.g. repeater items) are the ones whose path ends with their index, closest first
      for (const scope of scopes) {
        const list = scope.node?.name;
        if (list && typeof scope.path.at(-1) === 'number' && !this.items.has(`${list}${itemSuffix}`)) {
          this.items.set(`${list}${itemSuffix}`, scope.data);
        }
      }
      this.sources = allSources(evaluateOptions.sources);

      Object.entries(functions(evaluateOptions.sources)).forEach(([name, { fn }]) => this.builtins.set(name, fn));
      disabledFunctions.forEach(name => this.builtins.set(name, () => {
        throw new FormulaError('disabled-function', `The function ${name} is not available`);
      }));
      this.builtins.set(GET, (object: unknown, key: string, path: string) => (isPlainObject(object) && hasOwnProperty(object, key)
        ? this.valueOrMissing(object[key], path)
        : this.missing(path)));
    }

    evaluate(formula: string, expect: ExpectedType): unknown {
      const compiled = compile(formula);
      if (!compiled.ok) {
        throw compiled.error;
      }
      return convertResult(compiled.code.evaluate(new EvaluationScope(this)), expect);
    }

    has(name: string): boolean {
      return this.builtins.has(name) || name.startsWith(prefix);
    }

    get(name: string): unknown {
      if (this.builtins.has(name)) {
        return this.builtins.get(name);
      }
      return name.startsWith(prefix)
        ? this.resolveRoot(name.slice(prefix.length))
        : undefined;
    }

    builtinNames(): string[] {
      return [
        ...this.builtins.keys(),
      ];
    }

    private missing(path: string): unknown {
      if (!this.lists) {
        const variables = [
          ...(this.evaluateOptions.variables ?? []),
          ...sourceVariables(this.evaluateOptions.sources),
        ];
        this.lists = new Set(variables.filter(variable => variable.type === 'list').map(variable => variable.name));
      }
      const name = path.startsWith(prefix)
        ? path.slice(prefix.length)
        : path;
      if (this.lists.has(name)) {
        return [];
      }
      if (this.evaluateOptions.missing === 'fail') {
        throw new FormulaError('missing-value', `${prefix}${name} has no value`);
      }
      return missingValue;
    }

    private valueOrMissing(value: unknown, path: string): unknown {
      return value ?? this.missing(path);
    }

    // a copy on each access, so that a formula changing a value (e.g. with `sort`) doesn't see the change later on
    private resolveRoot(root: string): unknown {
      return copyValue(this.resolveRootValue(root));
    }

    private resolveRootValue(root: string): unknown {
      if (this.items.has(root)) {
        return this.valueOrMissing(this.items.get(root), root);
      }
      if (isPlainObject(this.rootData) && hasOwnProperty(this.rootData, root)) {
        return this.valueOrMissing(this.rootData[root], root);
      }
      if (!this.sourceByRoot) {
        this.sourceByRoot = new Map();
        // the first source claiming a root wins, the sources given to the evaluation come first
        for (const source of this.sources) {
          for (const sourceRoot of source.roots()) {
            if (!this.sourceByRoot.has(sourceRoot)) {
              this.sourceByRoot.set(sourceRoot, source);
            }
          }
        }
      }
      const source = this.sourceByRoot.get(root);
      if (!source) {
        return this.missing(root);
      }
      if (source.pending?.()) {
        this.pending = true;
        return this.missing(root);
      }
      const key = `${source.id}\u0000${root}`;
      if (this.memo.has(key)) {
        return this.memo.get(key);
      }
      if (this.inProgress.has(key)) {
        throw new FormulaError('cycle', `${prefix}${root} references itself`);
      }
      this.inProgress.add(key);
      try {
        const value = this.valueOrMissing(source.resolve(root, {
          evaluate: formula => this.evaluate(formula, 'any'),
        }), root);
        this.memo.set(key, value);
        return value;
      }
      finally {
        this.inProgress.delete(key);
      }
    }
  }

  // the scope mathjs evaluates a formula in, assignments only change it, not the data
  class EvaluationScope {
    private readonly locals = new Map<string, unknown>();

    constructor(private readonly evaluation: Evaluation) {}

    has(name: string) {
      return this.locals.has(name) || this.evaluation.has(name);
    }

    get(name: string) {
      return this.locals.has(name)
        ? this.locals.get(name)
        : this.evaluation.get(name);
    }

    set(name: string, value: unknown) {
      this.locals.set(name, value);
      return this;
    }

    delete(name: string) {
      return this.locals.delete(name);
    }

    clear() {
      this.locals.clear();
    }

    keys() {
      return new Set([
        ...this.locals.keys(),
        ...this.evaluation.builtinNames(),
      ]).values();
    }
  }

  return Object.assign(engine, {
    math,
    prefix,
    itemSuffix,
    missingValue,
    sources: engineSources,
    compile,
    evaluate: (formula, evaluateOptions) => {
      const result = evaluateDetailed(formula, evaluateOptions);
      return result.ok
        ? result.value
        : undefined;
    },
    evaluateDetailed,
    analyze: (formula, context = {}, analyzeOptions = {}) => analyzeFormula(engine, formula, context, analyzeOptions.sources ?? []),
    schemaVariables: (schema, components, variablesOptions) => schemaVariables(schema, components, {
      sourceId: 'form',
      ...variablesOptions,
      itemSuffix,
    }),
    sourceVariables,
    reservedNames,
    functions,
    isDisabledFunction: (name: string) => disabledFunctions.has(name),
  } satisfies FormulaEngine);
}
