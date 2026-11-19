/** The type of the value of a variable or of the result of a formula. */
export type FormulaValueType = 'number' | 'boolean' | 'string' | 'date' | 'list' | 'object' | 'unknown';

/**
 * The type a formula has to evaluate to. `date` is an ISO date string (YYYY-MM-DD),
 * `any` accepts every result except mathjs internals like units or result sets.
 */
export type ExpectedType = 'number' | 'boolean' | 'string' | 'date' | 'any';

export type FormulaVariableOption = { value: string; label?: string };

/** A variable that formulas can reference with the prefix, e.g. `group.field` as `$group.field`. */
export type FormulaVariable = {
  /** The path of the variable without prefix, e.g. `group.field` or `list_item.field`. */
  name: string;
  label?: string;
  description?: string;
  type?: FormulaValueType;
  /** The values the variable can take, e.g. the options of a select. */
  options?: FormulaVariableOption[];
  /** For the item variable of a list (e.g. `list_item`) and the variables inside of it, the name of the list. */
  itemOf?: string;
  /** The id of the source providing the variable, `form` for the fields of the form. */
  sourceId?: string;
  /** Where the variable is defined, e.g. a link to the settings of an external value. */
  href?: string;
  /** The node of the schema the variable is the data of, e.g. to select it in the builder. */
  node?: SchemaNodeLike;
};

/** A function formulas can call in addition to the functions of mathjs. */
export type FormulaFunction = {
  fn: (...args: any[]) => unknown;
  description?: string;
  /** e.g. `['formatMoney(value)']` */
  syntax?: string[];
  examples?: string[];
};

/** What a source gets to resolve the values of its variables. */
export type SourceResolveContext = {
  /** Evaluates another formula in the same evaluation, e.g. a named formula referenced by a formula. */
  evaluate: (formula: string) => unknown;
};

/**
 * Provides variables (and optionally functions) to formulas that are not fields of the form,
 * see `valueSource`, `schemaSource` and `formulaSource` for the common kinds.
 */
export type FormulaSource = {
  id: string;
  /** Shown as group of its variables, e.g. in the completion. */
  label?: string;
  /** The first segments of the variable names the source provides, e.g. `['name', 'group']` or its namespace. */
  roots: () => string[];
  /** The value of one of its `roots`, `undefined` and `null` count as missing. */
  resolve: (root: string, context: SourceResolveContext) => unknown;
  /** Describes its variables for validation and intellisense. */
  variables?: (engine: FormulaEngineInfo) => FormulaVariable[];
  functions?: Record<string, FormulaFunction>;
  /** While `true` (e.g. its data is still loading), its values are missing and results are marked as pending. */
  pending?: () => boolean;
};

/** The settings of an engine sources and helpers need to know about. */
export type FormulaEngineInfo = {
  prefix: string;
  itemSuffix: string;
};

/** The parts of a Former schema node the formula package needs (compatible with `SchemaNode` of `@former-ui/former`). */
export type SchemaNodeLike = {
  type: string;
  name?: string;
  props?: { [key: string]: any };
  children?: SchemaNodeLike[] | { [category: string]: SchemaNodeLike[] };
};

/** The parts of the Former components the formula package needs (compatible with `FormComponents`). */
export type ComponentsLike = {
  [type: string]: { propsSchema?: { name?: string }[]; isList?: boolean } | undefined;
};

/** A scope of data a node is in (compatible with `DataScope` of `@former-ui/former`), closest first. */
export type DataScopeLike = {
  node?: { name?: string };
  data: unknown;
  path: ReadonlyArray<string | number>;
};

export type FormulaErrorCode = 'empty' | 'syntax' | 'statements' | 'evaluation' | 'missing-value' | 'cycle' | 'disabled-function' | 'type-mismatch';

export class FormulaError extends Error {
  readonly code: FormulaErrorCode;

  constructor(code: FormulaErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'FormulaError';
    this.code = code;
  }
}

export type EvaluationResult
  = | { ok: true; value: unknown; pending: boolean }
    | { ok: false; error: FormulaError; pending: boolean };

export type EvaluateOptions = {
  /** The form data, used if no `scopes` are given. */
  data?: unknown;
  /** The scopes of the data the formula is evaluated in (e.g. of a field in a repeater item), the last one is the form data. */
  scopes?: ReadonlyArray<DataScopeLike>;
  /** Sources in addition to the ones of the engine, they come first. */
  sources?: ReadonlyArray<FormulaSource>;
  /** Variables of the form, so that e.g. lists without data evaluate to `[]`. */
  variables?: ReadonlyArray<FormulaVariable>;
  expect?: ExpectedType;
  /**
   * What happens with variables without value (except lists, which are `[]`): `value` evaluates them to the
   * `missingValue` of the engine, `fail` fails the evaluation, e.g. so that a constraint isn't applied while
   * the values it depends on are missing.
   */
  missing?: 'value' | 'fail';
};

export type DiagnosticCode
  = | 'syntax'
    | 'statements'
    | 'unknown-variable'
    | 'unknown-function'
    | 'disabled-function'
    | 'out-of-scope'
    | 'not-text-comparable'
    | 'unknown-option'
    | 'compare-text-with-equal-text'
    | 'type-mismatch'
    | 'self-reference'
    | 'ambiguous-variable';

export type Diagnostic = {
  code: DiagnosticCode;
  severity: 'error' | 'warning';
  /** The range in the formula text the diagnostic is about. */
  from: number;
  to: number;
  params: { [key: string]: unknown };
};

/** Where a formula is used, so that it can be checked (and later completed) for exactly that place. */
export type FormulaContext = {
  variables?: ReadonlyArray<FormulaVariable>;
  /** The type the formula has to evaluate to, e.g. `boolean` for a show if condition. */
  expect?: ExpectedType;
  /** The lists (e.g. repeaters) whose item exists around the formula, so their `_item` variables can be used without `map`. */
  loopScopes?: ReadonlyArray<string>;
  /** The variable of the node the formula belongs to, to warn about formulas referencing their own node. */
  self?: string;
};

export type TokenType = 'variable' | 'identifier' | 'number' | 'string' | 'comment' | 'operator' | 'bracket' | 'separator' | 'whitespace' | 'unknown';

export type Token = {
  type: TokenType;
  text: string;
  from: number;
  to: number;
};

/** A variable referenced by a formula. */
export type Reference = {
  /** The path without prefix, e.g. `group.field`. */
  name: string;
  from: number;
  to: number;
  /** The variable it refers to, if it is known. */
  variable?: FormulaVariable;
};

export type Analysis = {
  /** Whether the formula has no errors (it may have warnings). */
  ok: boolean;
  tokens: Token[];
  references: Reference[];
  diagnostics: Diagnostic[];
  /** The type the formula evaluates to, as far as it can be told without evaluating it. */
  inferredType: FormulaValueType;
};
