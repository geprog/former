import type { InternalSchemaNode } from '~/types';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { ref } from 'vue';

import FormDragContainer from './FormDragContainer.vue';
import FormNode from './FormNode.vue';
import FormRenderer from './FormRenderer.vue';

describe('component FormRenderer', () => {
  it('throws when schema is not provided by an ancestor', () => {
    expect(() =>
      mount(FormRenderer, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {},
        },
      }),
    ).toThrow('Please provide a value for schema');
  });

  it('renders one FormNode stub per root schema entry when schema is an array and category is unset', () => {
    const schema = ref<InternalSchemaNode[]>([
      { _id: 'a', type: 'text', name: 'a' },
      { _id: 'b', type: 'text', name: 'b' },
    ]);
    const wrapper = mount(FormRenderer, {
      shallow: true,
      attachTo: document.body,
      global: {
        renderStubDefaultSlot: true,
        provide: { schema },
      },
    });
    const stubs = wrapper.findAllComponents(FormNode);
    expect(stubs).toHaveLength(2);
    expect(stubs[0]!.props('node')).toBe(schema.value[0]);
    expect(stubs[1]!.props('node')).toBe(schema.value[1]);
  });

  it('renders no FormNode stubs when root schema is an empty array', () => {
    const schema = ref<InternalSchemaNode[]>([]);
    const wrapper = mount(FormRenderer, {
      shallow: true,
      attachTo: document.body,
      global: {
        renderStubDefaultSlot: true,
        provide: { schema },
      },
    });
    expect(wrapper.findAllComponents(FormNode)).toHaveLength(0);
  });

  it('renders no FormNode stubs when root schema ref is undefined', () => {
    const schema = ref<InternalSchemaNode[] | undefined>(undefined);
    const wrapper = mount(FormRenderer, {
      shallow: true,
      attachTo: document.body,
      global: {
        renderStubDefaultSlot: true,
        provide: { schema },
      },
    });
    expect(wrapper.findAllComponents(FormNode)).toHaveLength(0);
  });

  it('renders no FormNode stubs when category is set and not default while schema is an array', () => {
    const schema = ref<InternalSchemaNode[]>([
      { _id: 'x', type: 'text', name: 'x' },
      { _id: 'y', type: 'text', name: 'y' },
    ]);
    const wrapper = mount(FormRenderer, {
      shallow: true,
      attachTo: document.body,
      props: { category: 'sections' },
      global: {
        renderStubDefaultSlot: true,
        provide: { schema },
      },
    });
    expect(wrapper.findAllComponents(FormNode)).toHaveLength(0);
  });

  it('renders full array when category is default', () => {
    const schema = ref<InternalSchemaNode[]>([
      { _id: 'x', type: 'text', name: 'x' },
      { _id: 'y', type: 'text', name: 'y' },
    ]);
    const wrapper = mount(FormRenderer, {
      shallow: true,
      attachTo: document.body,
      props: { category: 'default' },
      global: {
        renderStubDefaultSlot: true,
        provide: { schema },
      },
    });
    expect(wrapper.findAllComponents(FormNode)).toHaveLength(2);
  });

  it('uses default branch of categorized schema when category prop is omitted', () => {
    const categorized = {
      default: [{ _id: 'd1', type: 'text', name: 'n1' }],
      extra: [{ _id: 'e1', type: 'text', name: 'n2' }],
    };
    const schema = ref(categorized as unknown as InternalSchemaNode[]);
    const wrapper = mount(FormRenderer, {
      shallow: true,
      attachTo: document.body,
      global: {
        renderStubDefaultSlot: true,
        provide: { schema },
      },
    });
    const stubs = wrapper.findAllComponents(FormNode);
    expect(stubs).toHaveLength(1);
    expect(stubs[0]!.props('node')).toStrictEqual(categorized.default[0]);
  });

  it('selects the matching category slice when schema is categorized', () => {
    const categorized = {
      default: [{ _id: 'd1', type: 'text', name: 'n1' }],
      extra: [{ _id: 'e1', type: 'text', name: 'n2' }],
    };
    const schema = ref(categorized as unknown as InternalSchemaNode[]);
    const wrapper = mount(FormRenderer, {
      shallow: true,
      attachTo: document.body,
      props: { category: 'extra' },
      global: {
        renderStubDefaultSlot: true,
        provide: { schema },
      },
    });
    const stubs = wrapper.findAllComponents(FormNode);
    expect(stubs).toHaveLength(1);
    expect(stubs[0]!.props('node')).toStrictEqual(categorized.extra[0]);
  });

  it('renders no FormNode stubs when category key is missing on categorized schema', () => {
    const categorized = { default: [] as InternalSchemaNode[] };
    const schema = ref(categorized as unknown as InternalSchemaNode[]);
    const wrapper = mount(FormRenderer, {
      shallow: true,
      attachTo: document.body,
      props: { category: 'missing' },
      global: {
        renderStubDefaultSlot: true,
        provide: { schema },
      },
    });
    expect(wrapper.findAllComponents(FormNode)).toHaveLength(0);
  });

  it('uses injected node children instead of root schema when node is provided', () => {
    const rootSchema = ref<InternalSchemaNode[]>([{ _id: 'root-only', type: 'text', name: 'r' }]);
    const node = ref({
      _id: 'parent',
      type: 'group',
      name: 'g',
      children: [
        { _id: 'c1', type: 'text', name: 'c1' },
        { _id: 'c2', type: 'text', name: 'c2' },
      ],
    });
    const wrapper = mount(FormRenderer, {
      shallow: true,
      attachTo: document.body,
      global: {
        renderStubDefaultSlot: true,
        provide: { schema: rootSchema, node },
      },
    });
    const stubs = wrapper.findAllComponents(FormNode);
    expect(stubs).toHaveLength(2);
    expect(stubs[0]!.props('node')).toBe(node.value.children[0]);
    expect(stubs[1]!.props('node')).toBe(node.value.children[1]);
  });

  it('forwards category prop to FormDragContainer stub', () => {
    const schema = ref<InternalSchemaNode[]>([{ _id: 'only', type: 'text', name: 'o' }]);
    const wrapper = mount(FormRenderer, {
      shallow: true,
      attachTo: document.body,
      props: { category: 'my-cat' },
      global: {
        renderStubDefaultSlot: true,
        provide: { schema },
      },
    });
    const drag = wrapper.findComponent(FormDragContainer);
    expect(drag.exists()).toBe(true);
    expect(drag.props('category')).toBe('my-cat');
  });
});
