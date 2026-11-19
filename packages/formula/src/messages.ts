import type { Diagnostic, FormulaEngineInfo } from './types';

/** Turns a diagnostic into a message, e.g. to translate them. */
export type DiagnosticMessage = (diagnostic: Diagnostic, engine: FormulaEngineInfo) => string;

function list(value: unknown): string {
  return Array.isArray(value)
    ? value.join(', ')
    : String(value);
}

/** The english message of a diagnostic. */
export const describeDiagnostic: DiagnosticMessage = ({ code, params }, { prefix }) => {
  const variable = `"${prefix}${String(params.name)}"`;
  switch (code) {
    case 'syntax':
      return `Syntax error: ${String(params.message)}`;
    case 'statements':
      return 'A formula has to be a single expression, e.g. without semicolons';
    case 'unknown-variable':
      return params.prefix
        ? `Unknown name "${String(params.name)}", variables start with "${prefix}"`
        : `Unknown variable ${variable}`;
    case 'unknown-function':
      return `Unknown function "${String(params.name)}"`;
    case 'disabled-function':
      return `The function "${String(params.name)}" is not available`;
    case 'out-of-scope':
      return `${variable} is only available inside of the list "${String(params.list)}", e.g. in map(${prefix}${String(params.list)}, f(${prefix}${String(params.name).split('.')[0]}) = …)`;
    case 'not-text-comparable':
      return `${variable} is a ${String(params.type)} and can't be compared as text`;
    case 'unknown-option':
      return `"${String(params.literal)}" is not an option of ${variable} (${list(params.options)})`;
    case 'compare-text-with-equal-text':
      return `Text can't be compared with ${String(params.operator)}, use equalText(a, b) instead`;
    case 'type-mismatch':
      return `The formula should evaluate to a ${String(params.expected)}, but evaluates to a ${String(params.actual)}`;
    case 'self-reference':
      return `The formula refers to its own field ${variable}`;
    case 'ambiguous-variable':
      return `${variable} is provided by several sources (${list(params.sources)})`;
  }
};

/** The english message for a field named like a variable of a source. */
export function describeReservedName(name: string, { prefix }: FormulaEngineInfo): string {
  return `The name "${name}" is already used by the variable "${prefix}${name}"`;
}
