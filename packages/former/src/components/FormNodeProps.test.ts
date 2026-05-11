import type { FormComponents, InternalSchemaNode, Validator } from '~/types';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref, type Ref } from 'vue';
import * as utils from '~/utils';

import Former from './Former.vue';
import FormNodeProps from './FormNodeProps.vue';

const FIELD_DUMMY = defineComponent({ name: 'FieldDummy', template: '<span />' });

const MINIMAL_COMPONENTS: Ref<FormComponents> = ref({
  text: {
    label: 'Text',
    propsSchema: [{ type: 'text', name: 'title' }],
    component: FIELD_DUMMY,
  },
  number: {
    label: 'Number',
    propsSchema: [{ type: 'text', name: 'value' }],
    component: FIELD_DUMMY,
  },
});

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
    vi.restoreAllMocks();
  });

  it('mounts without throwing when provides are wired', () => {
    const selectedNode = ref<InternalSchemaNode | undefined>({
      _id: 'node-1',
      type: 'text',
      name: 'myField',
      props: { custom: 'orig' },
    });
    const schema = ref<InternalSchemaNode[]>([
      { _id: 'node-1', type: 'text', name: 'myField', props: { custom: 'orig' } },
    ]);
    const validator: Validator = () => true;
    const wrapper = mount(FormNodeProps, {
      shallow: true,
      attachTo: document.body,
      global: {
        renderStubDefaultSlot: true,
        provide: {
          components: MINIMAL_COMPONENTS,
          schema,
          validator,
          selectedNode,
        },
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  describe('nothing selected', () => {
    it('renders the nothing-selected slot when selectedNode is undefined', () => {
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: 'myField', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: MINIMAL_COMPONENTS,
            schema,
            validator,
            selectedNode,
          },
        },
        slots: {
          'nothing-selected': '<p data-nothing-marker>none</p>',
        },
      });
      expect(wrapper.find('[data-nothing-marker]').exists()).toBe(true);
      expect(wrapper.findComponent(Former).exists()).toBe(false);
    });

    it('mounts without a selected node and skips props schema wiring', () => {
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: 'myField', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: MINIMAL_COMPONENTS,
            schema,
            validator,
            selectedNode,
          },
        },
      });
      expect(wrapper.find('.border-b-2').exists()).toBe(false);
      expect(wrapper.findComponent(Former).exists()).toBe(false);
      expect(toInternalSchemaSpy).not.toHaveBeenCalled();
    });
  });

  describe('header and labels', () => {
    it('shows the component label from FormComponents when the type exists', () => {
      const selectedNode = ref<InternalSchemaNode | undefined>({
        _id: 'node-1',
        type: 'text',
        name: 'myField',
        props: { custom: 'orig' },
      });
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: 'myField', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: MINIMAL_COMPONENTS,
            schema,
            validator,
            selectedNode,
          },
        },
      });
      expect(wrapper.text()).toContain('Text:');
    });

    it('shows the fallback label \'Element\' when the type is missing from components', () => {
      const selectedNode = ref<InternalSchemaNode | undefined>({
        _id: 'node-1',
        type: 'missing-type',
        name: 'myField',
        props: { custom: 'orig' },
      });
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'missing-type', name: 'myField', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: ref({}),
            schema,
            validator,
            selectedNode,
          },
        },
      });
      expect(wrapper.text()).toContain('Element:');
    });

    it('shows the node name when name is set', () => {
      const selectedNode = ref<InternalSchemaNode | undefined>({
        _id: 'node-1',
        type: 'text',
        name: 'VisibleName',
        props: { custom: 'orig' },
      });
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: 'VisibleName', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: MINIMAL_COMPONENTS,
            schema,
            validator,
            selectedNode,
          },
        },
      });
      expect(wrapper.text()).toContain('VisibleName');
    });

    it('hides the name row when name is empty', () => {
      const selectedNode = ref<InternalSchemaNode | undefined>({
        _id: 'node-1',
        type: 'text',
        name: '',
        props: { custom: 'orig' },
      });
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: '', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: MINIMAL_COMPONENTS,
            schema,
            validator,
            selectedNode,
          },
        },
      });
      const bold = wrapper.find('.font-bold');
      expect(bold.exists()).toBe(false);
    });
  });

  describe('props schema wiring and Former', () => {
    it('calls toInternalSchema with the type propsSchema when selection changes', async () => {
      const components = MINIMAL_COMPONENTS;
      const selectedNode = ref<InternalSchemaNode | undefined>({
        _id: 'node-1',
        type: 'text',
        name: 'myField',
        props: { custom: 'orig' },
      });
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: 'myField', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components,
            schema,
            validator,
            selectedNode,
          },
        },
      });
      expect(toInternalSchemaSpy).toHaveBeenCalledWith(components.value.text.propsSchema);
      toInternalSchemaSpy.mockClear();
      selectedNode.value = { _id: 'n2', type: 'number', name: 'n', props: {} };
      await nextTick();
      expect(toInternalSchemaSpy).toHaveBeenCalledWith(components.value.number.propsSchema);
    });

    it('renders the Former stub when propsSchema resolves', () => {
      const selectedNode = ref<InternalSchemaNode | undefined>({
        _id: 'node-1',
        type: 'text',
        name: 'myField',
        props: { custom: 'orig' },
      });
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: 'myField', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: MINIMAL_COMPONENTS,
            schema,
            validator,
            selectedNode,
          },
        },
      });
      const former = wrapper.findComponent(Former);
      expect(former.exists()).toBe(true);
      expect(former.props('mode')).toBe('edit');
    });

    it('renders the pre fallback when the selected type is missing from components', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'orphan', name: 'myField', props: { custom: 'orig' } };
      const selectedNode = ref<InternalSchemaNode | undefined>(node);
      const schema = ref<InternalSchemaNode[]>([node]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: ref({}),
            schema,
            validator,
            selectedNode,
          },
        },
      });
      expect(wrapper.findComponent(Former).exists()).toBe(false);
      expect(wrapper.find('pre').text()).toContain(node._id);
    });
  });

  describe('delete and unselect', () => {
    it('calls deleteNode and clears selectedNode when delete runs', async () => {
      const selectedNode = ref<InternalSchemaNode | undefined>({
        _id: 'node-1',
        type: 'text',
        name: 'myField',
        props: { custom: 'orig' },
      });
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: 'myField', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: MINIMAL_COMPONENTS,
            schema,
            validator,
            selectedNode,
          },
        },
      });
      const buttons = wrapper.findAll('button');
      await buttons[0]!.trigger('click');
      expect(deleteNodeSpy).toHaveBeenCalledWith(schema.value, 'node-1');
      expect(selectedNode.value).toBeUndefined();
    });

    it('clears selectedNode on unselect without calling deleteNode', async () => {
      const selectedNode = ref<InternalSchemaNode | undefined>({
        _id: 'node-1',
        type: 'text',
        name: 'myField',
        props: { custom: 'orig' },
      });
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: 'myField', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: MINIMAL_COMPONENTS,
            schema,
            validator,
            selectedNode,
          },
        },
      });
      deleteNodeSpy.mockClear();
      const buttons = wrapper.findAll('button');
      await buttons[1]!.trigger('click');
      expect(deleteNodeSpy).not.toHaveBeenCalled();
      expect(selectedNode.value).toBeUndefined();
    });
  });

  describe('data computed set', () => {
    it('calls replaceNode and updates selectedNode when Former emits update:data', async () => {
      const selectedNode = ref<InternalSchemaNode | undefined>({
        _id: 'node-1',
        type: 'text',
        name: 'myField',
        props: { custom: 'orig' },
      });
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: 'myField', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: MINIMAL_COMPONENTS,
            schema,
            validator,
            selectedNode,
          },
        },
      });
      const former = wrapper.findComponent(Former);
      await former.vm.$emit('update:data', { $name: 'renamed', custom: 'from-stub' });
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
      const selectedNode = ref<InternalSchemaNode | undefined>({
        _id: 'node-1',
        type: 'text',
        name: 'myField',
        props: { custom: 'orig' },
      });
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: 'myField', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: MINIMAL_COMPONENTS,
            schema,
            validator,
            selectedNode,
          },
        },
      });
      const former = wrapper.findComponent(Former);
      await former.vm.$emit('valid', false);
      expect(wrapper.emitted('valid')?.[0]).toEqual([false]);
    });
  });

  describe('scoped slots', () => {
    it('exposes delete and unselect handlers on named slots', async () => {
      const selectedNode = ref<InternalSchemaNode | undefined>({
        _id: 'node-1',
        type: 'text',
        name: 'myField',
        props: { custom: 'orig' },
      });
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: 'myField', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: MINIMAL_COMPONENTS,
            schema,
            validator,
            selectedNode,
          },
        },
        slots: {
          'delete-button': ({ delete: del }: { delete: () => void }) =>
            h('button', { 'type': 'button', 'onClick': del, 'data-slot-delete': '' }, 'slot-del'),
          'unselect-button': ({ unselect: unsel }: { unselect: () => void }) =>
            h('button', { 'type': 'button', 'onClick': unsel, 'data-slot-unselect': '' }, 'slot-un'),
        },
      });
      deleteNodeSpy.mockClear();
      await wrapper.find('[data-slot-delete]').trigger('click');
      expect(deleteNodeSpy).toHaveBeenCalledWith(schema.value, 'node-1');
      expect(selectedNode.value).toBeUndefined();

      selectedNode.value = {
        _id: 'node-1',
        type: 'text',
        name: 'myField',
        props: { custom: 'orig' },
      };
      await nextTick();
      deleteNodeSpy.mockClear();
      await wrapper.find('[data-slot-unselect]').trigger('click');
      expect(deleteNodeSpy).not.toHaveBeenCalled();
      expect(selectedNode.value).toBeUndefined();
    });

    it('exposes node-actions slot with node (SchemaNode), addNode, and removeNode', async () => {
      const selectedNode = ref<InternalSchemaNode | undefined>({
        _id: 'node-1',
        type: 'text',
        name: 'myField',
        props: { custom: 'orig' },
      });
      const schema = ref<InternalSchemaNode[]>([
        { _id: 'node-1', type: 'text', name: 'myField', props: { custom: 'orig' } },
      ]);
      const validator: Validator = () => true;
      const wrapper = mount(FormNodeProps, {
        shallow: true,
        attachTo: document.body,
        global: {
          renderStubDefaultSlot: true,
          provide: {
            components: MINIMAL_COMPONENTS,
            schema,
            validator,
            selectedNode,
          },
        },
        slots: {
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
        },
      });
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
