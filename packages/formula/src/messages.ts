import type { Diagnostic, FormulaEngineInfo } from './types';
import en from './locales/en.json' with { type: 'json' };

/** Translates a text of the package by its key, e.g. `(key, named) => t(key, named ?? {})` of vue-i18n. */
export type Translate = (key: string, named?: Record<string, unknown>) => string;

/** Turns a diagnostic into a message. */
export type DiagnosticMessage = (diagnostic: Diagnostic, engine: FormulaEngineInfo) => string;

/** Uses the english texts of the package, used when no translation is given. */
export const translateToEnglish: Translate = (key, named = {}) =>
  ((en as Record<string, string>)[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(named[name] ?? ''));

function list(value: unknown): string {
  return Array.isArray(value)
    ? value.join(', ')
    : String(value);
}

/** The message of a diagnostic, in english unless a translation is given. */
export function diagnosticMessage({ code, params }: Diagnostic, { prefix }: FormulaEngineInfo, translate: Translate = translateToEnglish): string {
  const name = String(params.name ?? '');
  const variable = `"${prefix}${name}"`;
  const type = (value: unknown) => translate(`formula_type_${String(value ?? 'unknown')}`);
  switch (code) {
    case 'syntax':
      return translate('formula_syntax', { message: params.message });
    case 'statements':
      return translate('formula_statements');
    case 'unknown-variable':
      return params.prefix
        ? translate('formula_missing_prefix', { name, prefix })
        : translate('formula_unknown_variable', { variable });
    case 'unknown-function':
      return translate('formula_unknown_function', { name });
    case 'disabled-function':
      return translate('formula_disabled_function', { name });
    case 'out-of-scope':
      return translate('formula_out_of_scope', {
        variable,
        list: params.list,
        example: `map(${prefix}${String(params.list)}, f(${prefix}${name.split('.')[0]}) = …)`,
      });
    case 'not-text-comparable':
      return translate('formula_not_text_comparable', {
        variable,
        type: type(params.type),
      });
    case 'unknown-option':
      return translate('formula_unknown_option', {
        variable,
        literal: params.literal,
        options: list(params.options),
      });
    case 'compare-text-with-equal-text':
      return translate('formula_compare_text_with_equal_text', { operator: params.operator });
    case 'type-mismatch':
      return translate('formula_type_mismatch', {
        expected: type(params.expected),
        actual: type(params.actual),
      });
    case 'self-reference':
      return translate('formula_self_reference', { variable });
    case 'ambiguous-variable':
      return translate('formula_ambiguous_variable', {
        variable,
        sources: list(params.sources),
      });
  }
}

/** The english message of a diagnostic. */
export const describeDiagnostic: DiagnosticMessage = (diagnostic, engine) => diagnosticMessage(diagnostic, engine);

/** The message for a field named like a variable of a source, in english unless a translation is given. */
export function reservedNameMessage(name: string, { prefix }: FormulaEngineInfo, translate: Translate = translateToEnglish): string {
  return translate('formula_reserved_name', { name, variable: `"${prefix}${name}"` });
}
