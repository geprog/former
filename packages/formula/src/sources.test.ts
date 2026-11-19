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
      id: 'ns',
      namespace: 'ns',
      label: 'Namespace',
      values: { date: '2026-11-19' },
    });
    expect(source.roots()).toEqual(['ns']);
    expect(engine.sourceVariables([source])).toEqual([
      {
        sourceId: 'ns',
        name: 'ns',
        type: 'object',
        label: 'Namespace',
      },
      { sourceId: 'ns', name: 'ns.date', type: 'string' },
    ]);
    expect(engine.evaluate('$ns.date', {
      sources: [source],
    })).toBe('2026-11-19');
  });

  it('reads the values of value sources on each evaluation', () => {
    const values = { a: 0.19 };
    const source = valueSource({
      id: 'settings',
      values: () => values,
    });
    expect(engine.evaluate('$a', {
      sources: [source],
    })).toBe(0.19);
    values.a = 0.07;
    expect(engine.evaluate('$a', {
      sources: [source],
    })).toBe(0.07);
  });

  it('provides the data of another form by its schema, without namespacing the item variables', () => {
    const source = schemaSource({
      id: 'other',
      namespace: 'other',
      schema,
      components,
      data: {
        group: {
          field: 3,
          list: [
            { field: 2 },
            { field: 4 },
          ],
        },
      },
    });
    expect(engine.sourceVariables([source]).map(variable => variable.name)).toEqual([
      'other',
      'other.name',
      'other.choice',
      'other.group',
      'other.group.field',
      'other.group.list',
      'list_item',
      'list_item.field',
    ]);
    expect(engine.evaluate('$other.group.field + sum(map($other.group.list, f($list_item) = $list_item.field))', {
      sources: [source],
    })).toBe(9);
  });

  it('claims the top-level fields of a schema without namespace', () => {
    const source = schemaSource({
      id: 'other',
      schema,
      components,
      data: {},
    });
    expect(source.roots()).toEqual(['name', 'choice', 'group']);
  });

  it('describes named formulas with the type of their result', () => {
    const source = formulaSource({
      id: 'calc',
      formulas: {
        product: '$a * $b',
        big: { formula: '$product > 10', label: 'Big product' },
        text: { formula: '$x', type: 'string' },
      },
    });
    expect(engine.sourceVariables([source])).toEqual([
      { sourceId: 'calc', name: 'product', type: 'number' },
      {
        sourceId: 'calc',
        name: 'big',
        type: 'boolean',
        label: 'Big product',
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
        { name: 'group', type: 'object' },
        { name: 'group.field', type: 'number', label: 'Field' },
      ],
    });
    expect(source.roots()).toEqual(['group']);
    expect(engine.sourceVariables([source])).toEqual([
      { sourceId: 'remote', name: 'group', type: 'object' },
      {
        sourceId: 'remote',
        name: 'group.field',
        type: 'number',
        label: 'Field',
      },
    ]);
    expect(engine.evaluate('$group.field + 1', {
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
      id: 'other',
      schema,
      components,
      data: undefined,
    });
    const variables = engine.sourceVariables([source]);
    expect(engine.evaluate('$name', {
      sources: [source],
      variables,
    })).toBe('');
    expect(engine.evaluate('size($group.list)', {
      sources: [source],
      variables,
    })).toEqual([0]);
  });

  it('reads the schema and data on each evaluation', () => {
    let data = { name: 'a' };
    const source = schemaSource({
      id: 'other',
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
