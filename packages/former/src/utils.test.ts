import type { InternalSchemaNode } from './types';
import { describe, expect, it } from 'vitest';
import { schemaIterator } from './utils';

describe('schema iterator', () => {
  it('should iterate over a flat array of schema nodes', () => {
    // given
    const schema: InternalSchemaNode[] = [
      { _id: 'a', type: 'text' },
      { _id: 'b', type: 'text' },
      { _id: 'c', type: 'text' },
    ];

    // when
    const iter = schemaIterator(schema);

    // then
    expect([...iter]).toStrictEqual(schema);
  });

  it('should handle empty schema', () => {
    // when
    const iter = schemaIterator([]);

    // then
    expect([...iter]).toStrictEqual([]);
  });

  it('should handle flat children of schema nodes', () => {
    // given
    const schemaNode = {
      _id: 'a',
      type: 'text',
      children: [
        { _id: 'b', type: 'text' },
        { _id: 'c', type: 'text' },
      ],
    };

    // when
    const iter = schemaIterator([schemaNode]);

    // then
    expect([...iter]).toStrictEqual([schemaNode, ...schemaNode.children]);
  });

  it('should handle categorized children of schema nodes', () => {
    // given
    const schemaNode = {
      _id: 'a',
      type: 'text',
      children: {
        category1: [{ _id: 'b', type: 'text' }],
        category2: [{ _id: 'c', type: 'text' }],
      },
    };

    // when
    const iter = schemaIterator([schemaNode]);

    // then
    expect([...iter]).toStrictEqual([schemaNode, ...schemaNode.children.category1, ...schemaNode.children.category2]);
  });

  it('should handle complex schema', () => {
    // given
    const schemaNodeWithFlatChildren = {
      _id: 'a',
      type: 'text',
      children: [
        { _id: 'b', type: 'text' },
        { _id: 'c', type: 'text' },
      ],
    };
    const schemaNodeWithChildrenCategories = {
      _id: 'd',
      type: 'text',
      children: {
        category1: [{ _id: 'e', type: 'text' }],
        category2: [{ _id: 'f', type: 'text' }],
      },
    };
    const schema: InternalSchemaNode[] = [
      { _id: 'x', type: 'text' },
      schemaNodeWithFlatChildren,
      schemaNodeWithChildrenCategories,
    ];

    // when
    const iter = schemaIterator(schema);

    // then
    expect([...iter]).toStrictEqual([
      schema[0],
      schemaNodeWithFlatChildren,
      ...schemaNodeWithFlatChildren.children,
      schemaNodeWithChildrenCategories,
      ...schemaNodeWithChildrenCategories.children.category1,
      ...schemaNodeWithChildrenCategories.children.category2,
    ]);
  });
});
