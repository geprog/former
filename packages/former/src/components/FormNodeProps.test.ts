import type { FormComponents, InternalSchemaNode, Validator } from '~/types';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, provide, ref, type Ref } from 'vue';
import * as utils from '~/utils';

import FormNodeProps from './FormNodeProps.vue';

vi.mock('./Former.vue', () => ({
  default: defineComponent({
    name: 'FormerStub',
    props: {
      schema: { type: Array, default: () => [] },
      data: { type: Object, default: () => ({}) },
      mode: { type: String, default: 'edit' },
      components: { type: Object, default: () => ({}) },
      validator: { type: Function, default: undefined },
    },
    emits: ['update:data', 'valid'],
    template: `
      <div data-former-stub>
        <span data-former-mode>{{ mode }}</span>
        <button type="button" data-former-emit-valid @click="$emit('valid', false)">emit-valid</button>
        <button
          type="button"
          data-former-update-data
          @click="$emit('update:data', { $name: 'renamed', custom: 'from-stub' })"
        >emit-data</button>
      </div>
    `,
  }),
}));

const mountedWrappers: Array<ReturnType<typeof mount>> = [];

function createNode(overrides: Partial<InternalSchemaNode> = {}): InternalSchemaNode {
  return {
    _id: 'node-1',
    type: 'text',
    name: 'myField',
    props: { custom: 'orig' },
    ...overrides,
  };
}

function minimalComponents(): FormComponents {
  const Dummy = defineComponent({ name: 'FieldDummy', template: '<span />' });
  return {
    text: {
      label: 'Text',
      propsSchema: [{ type: 'text', name: 'title' }],
      component: Dummy,
    },
    number: {
      label: 'Number',
      propsSchema: [{ type: 'text', name: 'value' }],
      component: Dummy,
    },
  };
}

function mountFormNodeProps(options?: {
  selectedNode?: Ref<InternalSchemaNode | undefined>;
  schema?: Ref<InternalSchemaNode[]>;
  components?: FormComponents;
  validator?: Validator;
  slots?: Record<string, string>;
}) {
  const selectedNode = options?.selectedNode ?? ref<InternalSchemaNode | undefined>(createNode());
  const schema = options?.schema ?? ref<InternalSchemaNode[]>([createNode()]);
  const components = options?.components ?? minimalComponents();
  const validator: Validator = options?.validator ?? (() => true);

  const Parent = defineComponent({
    setup(_, { slots }) {
      provide('components', components);
      provide('schema', schema);
      provide('validator', validator);
      provide('selectedNode', selectedNode);
      return () => {
        const childSlots: Record<string, () => unknown> = {};
        for (const key of ['nothing-selected', 'delete-button', 'unselect-button', 'node-actions'] as const) {
          if (slots[key]) {
            childSlots[key] = () => slots[key]?.();
          }
        }
        return h(FormNodeProps, null, childSlots);
      };
    },
  });

  const wrapper = mount(Parent, {
    attachTo: document.body,
    slots: options?.slots,
  });
  mountedWrappers.push(wrapper);
  return { wrapper, selectedNode, schema, components, validator };
}

describe('component FormNodeProps', () => {
  let deleteNodeSpy: ReturnType<typeof vi.spyOn>;
  let replaceNodeSpy: ReturnType<typeof vi.spyOn>;
  let toInternalSchemaSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    deleteNodeSpy = vi.spyOn(utils, 'deleteNode');
    replaceNodeSpy = vi.spyOn(utils, 'replaceNode');
    toInternalSchemaSpy = vi.spyOn(utils, 'toInternalSchema');
  });

  afterEach(() => {
    while (mountedWrappers.length) {
      const w = mountedWrappers.pop()!;
      if (w.exists()) {
        w.unmount();
      }
    }
    vi.restoreAllMocks();
  });

  it('mounts without throwing when provides are wired', () => {
    const { wrapper } = mountFormNodeProps();
    expect(wrapper.exists()).toBe(true);
  });

  describe('nothing selected', () => {
    it('renders the nothing-selected slot when selectedNode is undefined', () => {
      const { wrapper } = mountFormNodeProps({
        selectedNode: ref(undefined),
        slots: {
          'nothing-selected': '<p data-nothing-marker>none</p>',
        },
      });
      expect(wrapper.find('[data-nothing-marker]').exists()).toBe(true);
      expect(wrapper.find('[data-former-stub]').exists()).toBe(false);
    });

    it('mounts without a selected node and skips props schema wiring', () => {
      // With no selection, `data` getter would return `{}` and the setter no-ops (FormNodeProps.vue);
      // the props panel and Former stay unmounted, so `toInternalSchema` is never used.
      const { wrapper } = mountFormNodeProps({ selectedNode: ref(undefined) });
      expect(wrapper.find('.border-b-2').exists()).toBe(false);
      expect(wrapper.find('[data-former-stub]').exists()).toBe(false);
      expect(toInternalSchemaSpy).not.toHaveBeenCalled();
    });
  });

  describe('header and labels', () => {
    it('shows the component label from FormComponents when the type exists', () => {
      const { wrapper } = mountFormNodeProps();
      expect(wrapper.text()).toContain('Text:');
    });

    it('shows the fallback label \'Element\' when the type is missing from components', () => {
      const { wrapper } = mountFormNodeProps({
        selectedNode: ref(createNode({ type: 'missing-type' })),
        components: {},
      });
      expect(wrapper.text()).toContain('Element:');
    });

    it('shows the node name when name is set', () => {
      const { wrapper } = mountFormNodeProps({
        selectedNode: ref(createNode({ name: 'VisibleName' })),
      });
      expect(wrapper.text()).toContain('VisibleName');
    });

    it('hides the name row when name is empty', () => {
      const { wrapper } = mountFormNodeProps({
        selectedNode: ref(createNode({ name: '' })),
      });
      const bold = wrapper.find('.font-bold');
      expect(bold.exists()).toBe(false);
    });
  });

  describe('props schema wiring and Former', () => {
    it('calls toInternalSchema with the type propsSchema when selection changes', async () => {
      const components = minimalComponents();
      const selectedNode = ref<InternalSchemaNode | undefined>(createNode({ type: 'text' }));
      mountFormNodeProps({ selectedNode, components });
      expect(toInternalSchemaSpy).toHaveBeenCalledWith(components.text.propsSchema);
      toInternalSchemaSpy.mockClear();
      selectedNode.value = createNode({ _id: 'n2', type: 'number', name: 'n', props: {} });
      await nextTick();
      expect(toInternalSchemaSpy).toHaveBeenCalledWith(components.number.propsSchema);
    });

    it('renders the Former stub when propsSchema resolves', () => {
      const { wrapper } = mountFormNodeProps();
      expect(wrapper.find('[data-former-stub]').exists()).toBe(true);
      expect(wrapper.find('[data-former-mode]').text()).toBe('edit');
    });

    it('renders the pre fallback when the selected type is missing from components', () => {
      const node = createNode({ type: 'orphan' });
      const { wrapper } = mountFormNodeProps({
        selectedNode: ref(node),
        components: {},
      });
      expect(wrapper.find('[data-former-stub]').exists()).toBe(false);
      expect(wrapper.find('pre').text()).toContain(node._id);
    });
  });

  describe('delete and unselect', () => {
    it('calls deleteNode and clears selectedNode when delete runs', async () => {
      const selectedNode = ref<InternalSchemaNode | undefined>(createNode());
      const schema = ref<InternalSchemaNode[]>([createNode()]);
      const { wrapper } = mountFormNodeProps({ selectedNode, schema });
      const buttons = wrapper.findAll('button');
      await buttons[0]!.trigger('click');
      expect(deleteNodeSpy).toHaveBeenCalledWith(schema.value, 'node-1');
      expect(selectedNode.value).toBeUndefined();
    });

    it('clears selectedNode on unselect without calling deleteNode', async () => {
      const selectedNode = ref<InternalSchemaNode | undefined>(createNode());
      const { wrapper } = mountFormNodeProps({ selectedNode });
      deleteNodeSpy.mockClear();
      const buttons = wrapper.findAll('button');
      await buttons[1]!.trigger('click');
      expect(deleteNodeSpy).not.toHaveBeenCalled();
      expect(selectedNode.value).toBeUndefined();
    });
  });

  describe('data computed set', () => {
    it('calls replaceNode and updates selectedNode when Former emits update:data', async () => {
      const selectedNode = ref<InternalSchemaNode | undefined>(createNode());
      const schema = ref<InternalSchemaNode[]>([createNode()]);
      const { wrapper } = mountFormNodeProps({ selectedNode, schema });
      const formerButtons = wrapper.findAll('[data-former-stub] button');
      await formerButtons[1]!.trigger('click');
      expect(replaceNodeSpy).toHaveBeenCalled();
      const [, updated] = replaceNodeSpy.mock.calls[0]!;
      expect(updated).toMatchObject({
        _id: 'node-1',
        name: 'renamed',
        props: { custom: 'from-stub' },
      });
      expect(selectedNode.value).toEqual(updated);
    });
  });

  describe('valid forwarding', () => {
    it('re-emits valid from Former', async () => {
      const { wrapper } = mountFormNodeProps();
      const formerButtons = wrapper.findAll('[data-former-stub] button');
      await formerButtons[0]!.trigger('click');
      expect(wrapper.findComponent(FormNodeProps).emitted('valid')?.[0]).toEqual([false]);
    });
  });

  describe('scoped slots', () => {
    it('exposes delete and unselect handlers on named slots', async () => {
      const selectedNode = ref<InternalSchemaNode | undefined>(createNode());
      const schema = ref<InternalSchemaNode[]>([createNode()]);
      const Parent = defineComponent({
        setup() {
          provide('components', minimalComponents());
          provide('schema', schema);
          provide('validator', () => true as const);
          provide('selectedNode', selectedNode);
          return () =>
            h(FormNodeProps, null, {
              'delete-button': ({ delete: del }: { delete: () => void }) =>
                h('button', { 'type': 'button', 'onClick': del, 'data-slot-delete': '' }, 'slot-del'),
              'unselect-button': ({ unselect: unsel }: { unselect: () => void }) =>
                h('button', { 'type': 'button', 'onClick': unsel, 'data-slot-unselect': '' }, 'slot-un'),
            });
        },
      });
      const wrapper = mount(Parent, { attachTo: document.body });
      mountedWrappers.push(wrapper);
      deleteNodeSpy.mockClear();
      await wrapper.find('[data-slot-delete]').trigger('click');
      expect(deleteNodeSpy).toHaveBeenCalledWith(schema.value, 'node-1');
      expect(selectedNode.value).toBeUndefined();

      selectedNode.value = createNode();
      await nextTick();
      deleteNodeSpy.mockClear();
      await wrapper.find('[data-slot-unselect]').trigger('click');
      expect(deleteNodeSpy).not.toHaveBeenCalled();
      expect(selectedNode.value).toBeUndefined();
    });

    it('exposes node-actions slot with node (SchemaNode), addNode, and removeNode', async () => {
      const selectedNode = ref<InternalSchemaNode | undefined>(createNode());
      const schema = ref<InternalSchemaNode[]>([createNode()]);
      const Parent = defineComponent({
        setup() {
          provide('components', minimalComponents());
          provide('schema', schema);
          provide('validator', () => true as const);
          provide('selectedNode', selectedNode);
          return () =>
            h(FormNodeProps, null, {
              'node-actions': (props: {
                node: { type: string };
                addNode: (n: { type: string; name?: string }) => void;
                removeNode: () => void;
              }) =>
                h('div', [
                  h('span', { 'data-node-type': '' }, props.node.type),
                  h(
                    'button',
                    {
                      'type': 'button',
                      'onClick': () => props.addNode({ type: 'number', name: 'added' }),
                      'data-slot-node-actions-add': '',
                    },
                    'add',
                  ),
                  h('button', { 'type': 'button', 'onClick': props.removeNode, 'data-slot-node-actions-remove': '' }, 'rm'),
                ]),
            });
        },
      });
      const wrapper = mount(Parent, { attachTo: document.body });
      mountedWrappers.push(wrapper);
      expect(wrapper.find('[data-node-type]').text()).toBe('text');
      deleteNodeSpy.mockClear();
      await wrapper.find('[data-slot-node-actions-add]').trigger('click');
      expect(schema.value.length).toBe(2);
      expect(selectedNode.value?.type).toBe('number');
      deleteNodeSpy.mockClear();
      await wrapper.find('[data-slot-node-actions-remove]').trigger('click');
      expect(deleteNodeSpy).toHaveBeenCalledWith(schema.value, expect.any(String));
      expect(selectedNode.value).toBeUndefined();
    });
  });
});
