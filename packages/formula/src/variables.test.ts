import type { SchemaNodeLike } from './types';
import { describe, expect, it } from 'vitest';
import { components, repeater, schema } from '../test/fixtures';
import { describeValues, listsAround, schemaVariables, variableNameOfNode } from './variables';

describe('schemaVariables', () => {
  it('names the variables by the path of their data, with the items of lists as own variables', () => {
    expect(schemaVariables(schema, components)).toEqual([
      { name: 'name', type: 'string', label: 'Name' },
      {
        name: 'choice',
        type: 'string',
        options: [
          { value: 'red', label: 'Red' },
        ],
      },
      { name: 'group', type: 'object' },
      { name: 'group.field', type: 'number' },
      { name: 'group.list', type: 'list', label: 'List' },
      {
        name: 'list_item',
        type: 'object',
        label: 'List',
        itemOf: 'list',
      },
      { name: 'list_item.field', type: 'number', itemOf: 'list' },
    ]);
  });

  it('tells the variable of a node and the lists around it', () => {
    const field = (repeater.children as SchemaNodeLike[])[0]!;
    expect(variableNameOfNode(field, [schema[2]!, repeater], components)).toBe('list_item.field');
    expect(variableNameOfNode(repeater, [schema[2]!], components)).toBe('group.list');
    expect(variableNameOfNode(schema[1]!, [], components)).toBeUndefined();
    expect(listsAround([schema[2]!, repeater], components)).toEqual(['list']);
  });
});

describe('describeValues', () => {
  it('describes plain data', () => {
    expect(describeValues({
      a: 0.19,
      group: { field: 1 },
      tags: ['a'],
      on: true,
    })).toEqual([
      { name: 'a', type: 'number' },
      { name: 'group', type: 'object' },
      { name: 'group.field', type: 'number' },
      { name: 'tags', type: 'list' },
      { name: 'on', type: 'boolean' },
    ]);
  });
});
