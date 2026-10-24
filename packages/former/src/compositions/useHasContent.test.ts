import type { FieldData, FormComponents, FormData, SchemaNode } from '~/types';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { useHasContent } from './useHasContent';

function hasContent(nodes: SchemaNode[], data: FieldData | FormData) {
  return useHasContent(nodes, data).value;
}

// evaluates the content check in a component, so it can inject what the form provides
function hasContentInForm(nodes: SchemaNode[], data: FieldData | FormData, provide: Record<string, unknown>) {
  let result: boolean | undefined;
  mount(defineComponent({
    setup() {
      result = useHasContent(nodes, data).value;
      return () => h('div');
    },
  }), { global: { provide } });
  return result;
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

  it('counts list items even if they are empty', () => {
    const list: SchemaNode = { type: 'repeater', name: 'l', children: [text] };

    expect(hasContent([list], { l: [{}, { a: null }] })).toBe(true);
  });

  it('only counts the items of lists without data whose component is a list', () => {
    const list: SchemaNode = { type: 'repeater', name: 'l', children: [image] };
    const components = ref<FormComponents>({ repeater: { label: 'Repeater', propsSchema: [], component: {}, isList: true } });

    expect(hasContentInForm([list], {}, { components })).toBe(false);
    expect(hasContentInForm([list], { l: null }, { components })).toBe(false);
    expect(hasContentInForm([list], { l: [{}] }, { components })).toBe(true);
    // without the component, the list is treated like a group whose image shows something
    expect(hasContent([list], {})).toBe(true);
  });
});

describe('useHasContent in a form', () => {
  it('only checks the children a component shows', () => {
    const layout: SchemaNode = { type: 'layout', children: { shown: [{ ...text, name: 'a' }], removed: [{ ...text, name: 'b' }] } };
    const components = ref<FormComponents>({
      layout: { label: 'Layout', propsSchema: [], component: {}, shownChildren: node => (node.children as Record<string, SchemaNode[]>).shown! },
    });

    expect(hasContentInForm([layout], { a: 'value' }, { components })).toBe(true);
    expect(hasContentInForm([layout], { b: 'value' }, { components })).toBe(false);
  });

  it('is false for components without shown children even if they have no children at all', () => {
    const components = ref<FormComponents>({
      layout: { label: 'Layout', propsSchema: [], component: {}, shownChildren: () => [] },
    });

    expect(hasContentInForm([{ type: 'layout' }], {}, { components })).toBe(false);
  });

  it('ignores nodes hidden by their show if condition', () => {
    const hiddenImage: SchemaNode = { ...image, showIf: 'hidden' };
    const hiddenText: SchemaNode = { ...text, showIf: 'hidden' };
    const showIf = (node: SchemaNode) => node.showIf !== 'hidden';

    expect(hasContentInForm([hiddenImage, hiddenText], { a: 'value' }, { showIf })).toBe(false);
  });
});
