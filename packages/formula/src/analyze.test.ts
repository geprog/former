import type { FormulaContext, FormulaVariable } from './types';
import { all, create } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { createFormulaEngine } from './engine';
import { valueSource } from './sources';

const engine = createFormulaEngine({
  math: create(all),
});

const variables: FormulaVariable[] = [
  { name: 'number', type: 'number', sourceId: 'form' },
  {
    name: 'choice',
    type: 'string',
    sourceId: 'form',
    options: [
      { value: 'red' },
      { value: 'blue' },
    ],
  },
  { name: 'text', type: 'string', sourceId: 'form' },
  { name: 'group', type: 'object', sourceId: 'form' },
  { name: 'group.field', type: 'number', sourceId: 'form' },
  { name: 'list', type: 'list', sourceId: 'form' },
  {
    name: 'list_item',
    type: 'object',
    itemOf: 'list',
    sourceId: 'form',
  },
  {
    name: 'list_item.field',
    type: 'number',
    itemOf: 'list',
    sourceId: 'form',
  },
  { name: 'settings', type: 'object', sourceId: 'settings' },
];

function analyze(formula: string, context: FormulaContext = {}) {
  return engine.analyze(formula, { variables, ...context });
}

function codes(formula: string, context: FormulaContext = {}) {
  return analyze(formula, context).diagnostics.map(({ code, from, to }) => [
    code,
    formula.slice(from, to),
  ]);
}

describe('analyze', () => {
  it('accepts valid formulas', () => {
    expect(analyze('$number * 2 + $group.field').ok).toBe(true);
    expect(analyze('equalText($choice, "red") ? pi : 0').ok).toBe(true);
    expect(analyze('').ok).toBe(true);
  });

  it('lists the referenced variables with their position', () => {
    expect(analyze('$number + $missing # $comment').references).toEqual([
      {
        name: 'number',
        from: 0,
        to: 7,
        variable: variables[0],
      },
      { name: 'missing', from: 10, to: 18 },
    ]);
  });

  it('reports syntax errors at their position', () => {
    expect(codes('1 + * 2')).toEqual([
      ['syntax', '*'],
    ]);
  });

  it('reports more than one statement', () => {
    expect(codes('1; $nope')).toEqual([
      ['statements', '1; $nope'],
      ['unknown-variable', '$nope'],
    ]);
  });

  it('reports unknown variables and functions', () => {
    expect(codes('$nope + $group.nope + nope + nope2(1)')).toEqual([
      ['unknown-variable', '$nope'],
      ['unknown-variable', '$group.nope'],
      ['unknown-variable', 'nope'],
      ['unknown-function', 'nope2'],
    ]);
  });

  it('accepts paths below variables without described children', () => {
    expect(analyze('$settings.any.path').ok).toBe(true);
  });

  it('accepts parameters and functions defined in the formula', () => {
    expect(analyze('map($list, f(x) = x.field * 2)').ok).toBe(true);
    expect(analyze('map($list, f($item) = $item.field)').ok).toBe(true);
  });

  it('reports disabled functions', () => {
    expect(codes('evaluate("1")')).toEqual([
      ['disabled-function', 'evaluate'],
    ]);
  });

  it('accepts the functions of sources', () => {
    const sources = [
      {
        ...valueSource({ id: 'x', values: {} }),
        functions: {
          double: {
            fn: (x: number) => x * 2,
          },
        },
      },
    ];
    expect(engine.analyze('double(1)', {}, { sources }).ok).toBe(true);
  });

  it('reports item variables outside of their list', () => {
    expect(codes('$list_item.field')).toEqual([
      ['out-of-scope', '$list_item.field'],
    ]);
    expect(analyze('$list_item.field', {
      loopScopes: ['list'],
    }).ok).toBe(true);
    expect(analyze('sum(map($list, f($list_item) = $list_item.field))').ok).toBe(true);
    expect(analyze('sum(map(filter($list, f($list_item) = true), f($list_item) = $list_item.field))').ok).toBe(true);
  });

  it('checks text comparisons', () => {
    expect(codes('equalText($number, "1")')).toEqual([
      ['not-text-comparable', '$number'],
    ]);
    expect(codes('equalText($choice, "green")')).toEqual([
      ['unknown-option', '"green"'],
    ]);
    expect(codes('equalText($choice ?? "green", "red")')).toEqual([
      ['unknown-option', '"green"'],
    ]);
    expect(analyze('equalText($text, "anything")').ok).toBe(true);
  });

  it('reports comparing text with == and !=', () => {
    expect(codes('$choice == "red"')).toEqual([
      ['compare-text-with-equal-text', '"red"'],
    ]);
    expect(analyze('$number == "1"').ok).toBe(true);
  });

  it('warns about formulas not evaluating to the expected type', () => {
    expect(analyze('$number + 1', { expect: 'boolean' }).diagnostics).toMatchObject([
      {
        code: 'type-mismatch',
        severity: 'warning',
        params: { expected: 'boolean', actual: 'number' },
      },
    ]);
    expect(analyze('$number > 1 and $number < 10', { expect: 'boolean' }).diagnostics).toEqual([]);
    expect(analyze('$number > 1 ? $number : "none"').inferredType).toBe('unknown');
    expect(analyze('$number > 1 ? $number : 0', { expect: 'number' }).diagnostics).toEqual([]);
  });

  it('warns about formulas referencing their own field', () => {
    expect(analyze('$number * 2', { self: 'number' }).diagnostics).toMatchObject([
      { code: 'self-reference', severity: 'warning' },
    ]);
  });

  it('warns about variables provided by several sources', () => {
    const ambiguous = [
      ...variables,
      { name: 'number', type: 'number' as const, sourceId: 'settings' },
    ];
    expect(engine.analyze('$number', { variables: ambiguous }).diagnostics).toMatchObject([
      {
        code: 'ambiguous-variable',
        severity: 'warning',
        params: {
          name: 'number',
          sources: ['form', 'settings'],
        },
      },
    ]);
  });
});
