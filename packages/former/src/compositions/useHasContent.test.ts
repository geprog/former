import type { FieldData, FormData, SchemaNode } from '~/types';
import { describe, expect, it } from 'vitest';
import { useHasContent } from './useHasContent';

function hasContent(nodes: SchemaNode[], data: FieldData | FormData, isList?: (node: SchemaNode) => boolean) {
  return useHasContent(nodes, data, { isList }).value;
}

const text: SchemaNode = { type: 'text', name: 'a' };
const image: SchemaNode = { type: 'image' };

describe('useHasContent', () => {
  it('is false without nodes', () => {
    expect(hasContent([], { a: 'value' })).toBe(false);
  });

  it('is true when a field has a value', () => {
    expect(hasContent([text], { a: 'value' })).toBe(true);
  });

  it.each([{}, { a: null }, { a: false }, { b: 'value' }, null, undefined])('is false when the fields of %j have no value', (data) => {
    expect(hasContent([text], data)).toBe(false);
  });

  it('is true for nodes without name and children like images', () => {
    expect(hasContent([image], {})).toBe(true);
  });

  it('checks the children of layout nodes against the same data', () => {
    const layout: SchemaNode = { type: 'layout', children: { 'column-0': [text] } };

    expect(hasContent([layout], { a: 'value' })).toBe(true);
    expect(hasContent([layout], { a: null })).toBe(false);
  });

  it('checks the children of named nodes against their data', () => {
    const group: SchemaNode = { type: 'group', name: 'g', children: [text] };

    expect(hasContent([group], { g: { a: 'value' } })).toBe(true);
    expect(hasContent([group], { g: { a: null } })).toBe(false);
    expect(hasContent([{ ...group, children: [image] }], {})).toBe(true);
  });

  it('only counts the items of lists, even empty ones', () => {
    const list: SchemaNode = { type: 'repeater', name: 'l', children: [image] };

    expect(hasContent([list], { l: [] })).toBe(false);
    expect(hasContent([list], { l: [{}] })).toBe(true);
  });

  it('only counts the items of lists without data that are detected by isList', () => {
    const list: SchemaNode = { type: 'repeater', name: 'l', children: [image] };
    const isList = (node: SchemaNode) => node.type === 'repeater';

    expect(hasContent([list], {}, isList)).toBe(false);
    expect(hasContent([list], { l: null }, isList)).toBe(false);
    expect(hasContent([list], { l: [{}] }, isList)).toBe(true);
  });
});
