import type { SchemaNodeLike } from './types';
import { describe, expect, it } from 'vitest';
import { components, repeater, schema } from '../test/fixtures';
import { describeValues, listsAround, schemaVariables, variableNameOfNode } from './variables';

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
