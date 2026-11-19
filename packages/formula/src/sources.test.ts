import { all, create } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { components, schema } from '../test/fixtures';
import { createFormulaEngine } from './engine';
import { formulaSource, schemaSource, valueSource } from './sources';

describe('sources', () => {
  const engine = createFormulaEngine({
    math: create(all),
  });

  it('namespaces the variables of value sources', () => {
    const source = valueSource({
      id: 'house',
      namespace: 'house',
      label: 'House',
      values: { today: '2026-11-19' },
    });
    expect(source.roots()).toEqual(['house']);
    expect(engine.sourceVariables([source])).toEqual([
      {
        sourceId: 'house',
        name: 'house',
        type: 'object',
        label: 'House',
      },
      { sourceId: 'house', name: 'house.today', type: 'string' },
    ]);
    expect(engine.evaluate('$house.today', {
      sources: [source],
    })).toBe('2026-11-19');
  });

  it('reads the values of value sources on each evaluation', () => {
    const values = { vat: 0.19 };
    const source = valueSource({
      id: 'settings',
      values: () => values,
    });
    expect(engine.evaluate('$vat', {
      sources: [source],
    })).toBe(0.19);
    values.vat = 0.07;
    expect(engine.evaluate('$vat', {
      sources: [source],
    })).toBe(0.07);
  });

  it('provides the data of another form by its schema, without namespacing the item variables', () => {
    const source = schemaSource({
      id: 'house',
      namespace: 'house',
      schema,
      components,
      data: {
        roof: {
          height: 3,
          rows: [
            { length: 2 },
            { length: 4 },
          ],
        },
      },
    });
    expect(engine.sourceVariables([source]).map(variable => variable.name)).toEqual([
      'house',
      'house.name',
      'house.color',
      'house.roof',
      'house.roof.height',
      'house.roof.rows',
      'rows_item',
      'rows_item.length',
    ]);
    expect(engine.evaluate('$house.roof.height + sum(map($house.roof.rows, f($rows_item) = $rows_item.length))', {
      sources: [source],
    })).toBe(9);
  });

  it('claims the top-level fields of a schema without namespace', () => {
    const source = schemaSource({
      id: 'house',
      schema,
      components,
      data: {},
    });
    expect(source.roots()).toEqual(['name', 'color', 'roof']);
  });

  it('describes named formulas with the type of their result', () => {
    const source = formulaSource({
      id: 'calc',
      formulas: {
        area: '$a * $b',
        big: { formula: '$area > 10', label: 'Big area' },
        text: { formula: '$x', type: 'string' },
      },
    });
    expect(engine.sourceVariables([source])).toEqual([
      { sourceId: 'calc', name: 'area', type: 'number' },
      {
        sourceId: 'calc',
        name: 'big',
        type: 'boolean',
        label: 'Big area',
      },
      { sourceId: 'calc', name: 'text', type: 'string' },
    ]);
    expect(engine.evaluate('$big', {
      data: { a: 3, b: 4 },
      sources: [source],
    })).toBe(true);
  });
});

describe('valueSource', () => {
  const engine = createFormulaEngine({
    math: create(all),
  });

  it('uses the described variables, also to claim names while the values are missing', () => {
    const source = valueSource({
      id: 'remote',
      values: {},
      variables: [
        { name: 'price', type: 'object' },
        { name: 'price.total', type: 'number', label: 'Total' },
      ],
    });
    expect(source.roots()).toEqual(['price']);
    expect(engine.sourceVariables([source])).toEqual([
      { sourceId: 'remote', name: 'price', type: 'object' },
      {
        sourceId: 'remote',
        name: 'price.total',
        type: 'number',
        label: 'Total',
      },
    ]);
    expect(engine.evaluate('$price.total + 1', {
      sources: [source],
    })).toBe(1);
  });

  it('passes its functions and pending state on', () => {
    const fn = (x: number) => x;
    const pending = () => true;
    const source = valueSource({
      id: 'x',
      values: {},
      functions: {
        identity: { fn },
      },
      pending,
    });
    expect(source.functions).toEqual({
      identity: { fn },
    });
    expect(source.pending).toBe(pending);
  });
});

describe('schemaSource', () => {
  const engine = createFormulaEngine({
    math: create(all),
  });

  it('evaluates fields without data as missing and lists without data as empty', () => {
    const source = schemaSource({
      id: 'house',
      schema,
      components,
      data: undefined,
    });
    const variables = engine.sourceVariables([source]);
    expect(engine.evaluate('$name', {
      sources: [source],
      variables,
    })).toBe('');
    expect(engine.evaluate('size($roof.rows)', {
      sources: [source],
      variables,
    })).toEqual([0]);
  });

  it('reads the schema and data on each evaluation', () => {
    let data = { name: 'a' };
    const source = schemaSource({
      id: 'house',
      schema: () => schema,
      components,
      data: () => data,
    });
    expect(engine.evaluate('$name', {
      sources: [source],
    })).toBe('a');
    data = { name: 'b' };
    expect(engine.evaluate('$name', {
      sources: [source],
    })).toBe('b');
  });
});

describe('formulaSource', () => {
  it('evaluates only the formulas of a namespace that are used', () => {
    let calls = 0;
    const engine = createFormulaEngine({
      math: create(all),
      functions: {
        count: {
          fn: () => ++calls,
        },
      },
    });
    const source = formulaSource({
      id: 'calc',
      namespace: 'calc',
      formulas: { a: 'count() * 0 + 1', b: 'count() * 0 + 2' },
    });
    expect(engine.evaluate('$calc.a + $calc.a', {
      sources: [source],
    })).toBe(2);
    expect(calls).toBe(1);
  });

  it('reads the formulas on each evaluation', () => {
    const engine = createFormulaEngine({
      math: create(all),
    });
    const formulas: Record<string, string> = { a: '1' };
    const source = formulaSource({
      id: 'calc',
      formulas: () => formulas,
    });
    expect(engine.evaluate('$a', {
      sources: [source],
    })).toBe(1);
    formulas.a = '2';
    formulas.b = '$a * 2';
    expect(engine.evaluate('$b', {
      sources: [source],
    })).toBe(4);
  });

  it('fails when a named formula fails', () => {
    const engine = createFormulaEngine({
      math: create(all),
    });
    const source = formulaSource({
      id: 'calc',
      formulas: { broken: '1 +' },
    });
    expect(engine.evaluateDetailed('$broken + 1', {
      sources: [source],
    })).toMatchObject({
      ok: false,
      error: { code: 'syntax' },
    });
  });
});
