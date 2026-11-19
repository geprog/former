import type { Diagnostic, DiagnosticCode } from './types';
import { describe, expect, it } from 'vitest';
import en from './locales/en.json' with { type: 'json' };
import { describeDiagnostic, diagnosticMessage, reservedNameMessage, translateToEnglish } from './messages';

const engine = { prefix: '$', itemSuffix: '_item' };

function diagnostic(code: DiagnosticCode, params: Diagnostic['params'] = {}): Diagnostic {
  return {
    code,
    severity: 'error',
    from: 0,
    to: 1,
    params,
  };
}

describe('diagnosticMessage', () => {
  it.each<[DiagnosticCode, Diagnostic['params'], string]>([
    [
      'syntax',
      { message: 'Unexpected end of expression (char 4)' },
      'Syntax error: Unexpected end of expression (char 4)',
    ],
    ['statements', {}, 'A formula has to be a single expression, e.g. without semicolons'],
    [
      'unknown-variable',
      { name: 'group.nope' },
      'Unknown variable "$group.nope"',
    ],
    [
      'unknown-variable',
      { name: 'field', prefix: '$' },
      'Unknown name "field", variables start with "$"',
    ],
    [
      'unknown-function',
      { name: 'nope' },
      'Unknown function "nope"',
    ],
    [
      'disabled-function',
      { name: 'evaluate' },
      'The function "evaluate" is not available',
    ],
    [
      'out-of-scope',
      { name: 'list_item.field', list: 'list' },
      '"$list_item.field" is only available inside of the list "list", e.g. in map($list, f($list_item) = …)',
    ],
    [
      'not-text-comparable',
      { name: 'field', type: 'number' },
      '"$field" is a number and can\'t be compared as text',
    ],
    [
      'unknown-option',
      {
        name: 'color',
        literal: 'green',
        options: ['red', 'blue'],
      },
      '"green" is not an option of "$color" (red, blue)',
    ],
    [
      'compare-text-with-equal-text',
      { literal: 'red', operator: '==' },
      'Text can\'t be compared with ==, use equalText(a, b) instead',
    ],
    [
      'type-mismatch',
      { expected: 'boolean', actual: 'object' },
      'The formula should evaluate to a boolean, but evaluates to an object',
    ],
    [
      'self-reference',
      { name: 'field' },
      'The formula refers to its own field "$field"',
    ],
    [
      'ambiguous-variable',
      {
        name: 'name',
        sources: ['form', 'settings'],
      },
      '"$name" is provided by several sources (form, settings)',
    ],
  ])('describes %s in english', (code, params, message) => {
    expect(diagnosticMessage(diagnostic(code, params), engine)).toBe(message);
    expect(describeDiagnostic(diagnostic(code, params), engine)).toBe(message);
  });

  it('translates with the given function', () => {
    const calls: [string, Record<string, unknown> | undefined][] = [];
    const translate = (key: string, named?: Record<string, unknown>) => {
      calls.push([key, named]);
      return `${key}:${JSON.stringify(named ?? {})}`;
    };
    expect(diagnosticMessage(diagnostic('type-mismatch', { expected: 'number', actual: 'string' }), engine, translate))
      .toBe('formula_type_mismatch:{"expected":"formula_type_number:{}","actual":"formula_type_string:{}"}');
    expect(calls.map(([key]) => key)).toEqual(['formula_type_number', 'formula_type_string', 'formula_type_mismatch']);
  });

  it('has an english text for every type', () => {
    for (const type of [
      'number',
      'boolean',
      'string',
      'date',
      'list',
      'object',
      'unknown',
      'any',
    ]) {
      expect(en).toHaveProperty(`formula_type_${type}`);
    }
  });
});

describe('reservedNameMessage', () => {
  it('describes a name taken by a variable', () => {
    expect(reservedNameMessage('name', engine)).toBe('The name "name" is already used by the variable "$name"');
  });
});

describe('translateToEnglish', () => {
  it('fills in the named values and falls back to the key', () => {
    expect(translateToEnglish('formula_unknown_variable', { variable: '"$a"' })).toBe('Unknown variable "$a"');
    expect(translateToEnglish('formula_unknown_key')).toBe('formula_unknown_key');
  });
});
