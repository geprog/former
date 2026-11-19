import type { ComponentsLike, SchemaNodeLike } from './types';
import { all, create } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { createFormulaEngine } from './engine';
import { tokenize } from './lexer';
import { formulaSource, schemaSource, valueSource } from './sources';
import { describeValues, listsAround, schemaVariables, variableNameOfNode } from './variables';

const named = [
  { name: '$name' },
];
const components: ComponentsLike = {
  text: { propsSchema: named },
  number: { propsSchema: named },
  select: { propsSchema: named },
  group: { propsSchema: named },
  repeater: { propsSchema: named, isList: true },
  columns: { propsSchema: [] },
};

const repeater: SchemaNodeLike = {
  type: 'repeater',
  name: 'rows',
  props: { label: 'Rows' },
  children: [
    { type: 'number', name: 'length' },
  ],
};
const schema: SchemaNodeLike[] = [
  {
    type: 'text',
    name: 'name',
    props: { label: 'Name' },
  },
  {
    type: 'columns',
    children: {
      left: [
        {
          type: 'select',
          name: 'color',
          props: {
            options: [
              { value: 'red', label: 'Red' },
              { value: '' },
            ],
          },
        },
      ],
    },
  },
  {
    type: 'group',
    name: 'roof',
    children: [
      { type: 'number', name: 'height' },
      repeater,
    ],
  },
];

describe('schemaVariables', () => {
  it('names the variables by the path of their data, with the items of lists as own variables', () => {
    expect(schemaVariables(schema, components)).toEqual([
      { name: 'name', type: 'string', label: 'Name' },
      {
        name: 'color',
        type: 'string',
        options: [
          { value: 'red', label: 'Red' },
        ],
      },
      { name: 'roof', type: 'object' },
      { name: 'roof.height', type: 'number' },
      { name: 'roof.rows', type: 'list', label: 'Rows' },
      {
        name: 'rows_item',
        type: 'object',
        label: 'Rows',
        itemOf: 'rows',
      },
      { name: 'rows_item.length', type: 'number', itemOf: 'rows' },
    ]);
  });

  it('tells the variable of a node and the lists around it', () => {
    const length = (repeater.children as SchemaNodeLike[])[0]!;
    expect(variableNameOfNode(length, [schema[2]!, repeater], components)).toBe('rows_item.length');
    expect(variableNameOfNode(repeater, [schema[2]!], components)).toBe('roof.rows');
    expect(variableNameOfNode(schema[1]!, [], components)).toBeUndefined();
    expect(listsAround([schema[2]!, repeater], components)).toEqual(['rows']);
  });
});

describe('describeValues', () => {
  it('describes plain data', () => {
    expect(describeValues({
      vat: 0.19,
      price: { total: 1 },
      tags: ['a'],
      on: true,
    })).toEqual([
      { name: 'vat', type: 'number' },
      { name: 'price', type: 'object' },
      { name: 'price.total', type: 'number' },
      { name: 'tags', type: 'list' },
      { name: 'on', type: 'boolean' },
    ]);
  });
});

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

describe('tokenize', () => {
  it('splits formulas into tokens, also when they are half typed', () => {
    expect(tokenize('$roof.width >= 2.5 and equalText($c, "a\\"b") # done\n$').map(({ type, text }) => [type, text])).toEqual([
      ['variable', '$roof.width'],
      ['whitespace', ' '],
      ['operator', '>='],
      ['whitespace', ' '],
      ['number', '2.5'],
      ['whitespace', ' '],
      ['identifier', 'and'],
      ['whitespace', ' '],
      ['identifier', 'equalText'],
      ['bracket', '('],
      ['variable', '$c'],
      ['separator', ','],
      ['whitespace', ' '],
      ['string', '"a\\"b"'],
      ['bracket', ')'],
      ['whitespace', ' '],
      ['comment', '# done'],
      ['whitespace', '\n'],
      ['variable', '$'],
    ]);
    expect(tokenize('$roof.').map(token => token.text)).toEqual(['$roof.']);
    expect(tokenize('"open').map(token => token.type)).toEqual(['string']);
  });
});
