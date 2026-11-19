import type { FormulaContext, FormulaVariable } from './types';
import { all, create } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { createFormulaEngine } from './engine';
import { valueSource } from './sources';

const engine = createFormulaEngine({
  math: create(all),
});

const variables: FormulaVariable[] = [
  { name: 'width', type: 'number', sourceId: 'form' },
  {
    name: 'color',
    type: 'string',
    sourceId: 'form',
    options: [
      { value: 'red' },
      { value: 'blue' },
    ],
  },
  { name: 'note', type: 'string', sourceId: 'form' },
  { name: 'roof', type: 'object', sourceId: 'form' },
  { name: 'roof.height', type: 'number', sourceId: 'form' },
  { name: 'rows', type: 'list', sourceId: 'form' },
  {
    name: 'rows_item',
    type: 'object',
    itemOf: 'rows',
    sourceId: 'form',
  },
  {
    name: 'rows_item.length',
    type: 'number',
    itemOf: 'rows',
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
    expect(analyze('$width * 2 + $roof.height').ok).toBe(true);
    expect(analyze('equalText($color, "red") ? pi : 0').ok).toBe(true);
    expect(analyze('').ok).toBe(true);
  });

  it('lists the referenced variables with their position', () => {
    expect(analyze('$width + $missing # $comment').references).toEqual([
      {
        name: 'width',
        from: 0,
        to: 6,
        variable: variables[0],
      },
      { name: 'missing', from: 9, to: 17 },
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
    expect(codes('$nope + $roof.nope + nope + nope2(1)')).toEqual([
      ['unknown-variable', '$nope'],
      ['unknown-variable', '$roof.nope'],
      ['unknown-variable', 'nope'],
      ['unknown-function', 'nope2'],
    ]);
  });

  it('accepts paths below variables without described children', () => {
    expect(analyze('$settings.vat.rate').ok).toBe(true);
  });

  it('accepts parameters and functions defined in the formula', () => {
    expect(analyze('map($rows, f(x) = x.length * 2)').ok).toBe(true);
    expect(analyze('map($rows, f($row) = $row.length)').ok).toBe(true);
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
    expect(codes('$rows_item.length')).toEqual([
      ['out-of-scope', '$rows_item.length'],
    ]);
    expect(analyze('$rows_item.length', {
      loopScopes: ['rows'],
    }).ok).toBe(true);
    expect(analyze('sum(map($rows, f($rows_item) = $rows_item.length))').ok).toBe(true);
    expect(analyze('sum(map(filter($rows, f($rows_item) = true), f($rows_item) = $rows_item.length))').ok).toBe(true);
  });

  it('checks text comparisons', () => {
    expect(codes('equalText($width, "1")')).toEqual([
      ['not-text-comparable', '$width'],
    ]);
    expect(codes('equalText($color, "green")')).toEqual([
      ['unknown-option', '"green"'],
    ]);
    expect(codes('equalText($color ?? "green", "red")')).toEqual([
      ['unknown-option', '"green"'],
    ]);
    expect(analyze('equalText($note, "anything")').ok).toBe(true);
  });

  it('reports comparing text with == and !=', () => {
    expect(codes('$color == "red"')).toEqual([
      ['compare-text-with-equal-text', '"red"'],
    ]);
    expect(analyze('$width == "1"').ok).toBe(true);
  });

  it('warns about formulas not evaluating to the expected type', () => {
    expect(analyze('$width + 1', { expect: 'boolean' }).diagnostics).toMatchObject([
      {
        code: 'type-mismatch',
        severity: 'warning',
        params: { expected: 'boolean', actual: 'number' },
      },
    ]);
    expect(analyze('$width > 1 and $width < 10', { expect: 'boolean' }).diagnostics).toEqual([]);
    expect(analyze('$width > 1 ? $width : "none"').inferredType).toBe('unknown');
    expect(analyze('$width > 1 ? $width : 0', { expect: 'number' }).diagnostics).toEqual([]);
  });

  it('warns about formulas referencing their own field', () => {
    expect(analyze('$width * 2', { self: 'width' }).diagnostics).toMatchObject([
      { code: 'self-reference', severity: 'warning' },
    ]);
  });

  it('warns about variables provided by several sources', () => {
    const ambiguous = [
      ...variables,
      { name: 'width', type: 'number' as const, sourceId: 'settings' },
    ];
    expect(engine.analyze('$width', { variables: ambiguous }).diagnostics).toMatchObject([
      {
        code: 'ambiguous-variable',
        severity: 'warning',
        params: {
          name: 'width',
          sources: ['form', 'settings'],
        },
      },
    ]);
  });
});
