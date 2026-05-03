import type { FormComponents, InternalSchemaNode, Validator } from '~/types';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, inject, nextTick, ref, type Ref } from 'vue';
import * as utils from '~/utils';

import FormNode from './FormNode.vue';

const DynamicComponent = defineComponent({
  name: 'DynamicComponent',
  props: {
    id: { type: String, required: true },
    mode: { type: String, required: true },
    error: { type: String, default: undefined },
    modelValue: { type: [String, Number, Boolean, Object, Array], default: undefined },
    custom: { type: String, default: undefined },
  },
  emits: ['update:modelValue'],
  template: `
    <section data-dynamic>
      <span data-id>{{ id }}</span>
      <span data-mode>{{ mode }}</span>
      <span data-error>{{ error }}</span>
      <span data-model>{{ modelValue }}</span>
      <span data-custom>{{ custom }}</span>
      <button data-update @click="$emit('update:modelValue', 'from-child')">update</button>
      <slot />
    </section>
  `,
});

const SlotProbe = defineComponent({
  name: 'SlotProbe',
  setup() {
    const node = inject<Ref<InternalSchemaNode>>('node');
    return () => h('span', { 'data-slot-node-id': node?.value?._id });
  },
});

const TEXT_COMPONENTS: FormComponents = {
  text: {
    label: 'Text',
    propsSchema: [{ type: 'text', name: '$name' }],
    component: DynamicComponent,
  },
};

describe('component FormNode', () => {
  let setDragEventDataSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    setDragEventDataSpy = vi.spyOn(utils, 'setDragEventData').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility and root rendering', () => {
    it('renders root wrapper when isShown is true', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'from-node-props' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
            showIf: () => true,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-node="node-1"]').exists()).toBe(true);
    });

    it('renders root wrapper in build mode even when isShown is false', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'from-node-props' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
            showIf: () => false,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-node="node-1"]').exists()).toBe(true);
    });

    it('does not render root wrapper when isShown is false and mode is not build', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'from-node-props' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('read');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
            showIf: () => false,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-node="node-1"]').exists()).toBe(false);
    });
  });

  describe('component resolution', () => {
    it('renders the resolved dynamic component when component is provided', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'from-node-props' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-dynamic]').exists()).toBe(true);
    });

    it('renders fallback text when component is missing', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: {} };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const componentsNoView: FormComponents = {
        text: {
          label: 'Text',
          propsSchema: [{ type: 'text', name: '$name' }],
          component: undefined as unknown as (typeof DynamicComponent),
        },
      };
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: componentsNoView,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.text()).toContain('Component type not found!');
    });
  });

  describe('dynamic component bindings', () => {
    it('passes node props to the rendered component', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'abc' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-custom]').text()).toBe('abc');
    });

    it('passes id as node._id to the rendered component', () => {
      const node: InternalSchemaNode = { _id: 'node-42', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-id]').text()).toBe('node-42');
    });

    it('passes mode prop to the rendered component', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('read');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-mode]').text()).toBe('read');
    });

    it('passes error prop from useNode to the rendered component', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => 'bad input';
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-error]').text()).toBe('bad input');
    });

    it('binds v-model to useNode modelValue', async () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'before' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-model]').text()).toBe('before');
      await wrapper.find('[data-update]').trigger('click');
      await nextTick();
      expect(data.value.field).toBe('from-child');
    });

    it('renders slot content inside the dynamic component', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-slot-node-id]').exists()).toBe(true);
    });
  });

  describe('build mode visuals', () => {
    it('sets draggable=true only in build mode', async () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      const root = wrapper.find('[data-node="node-1"]');
      expect(root.attributes('draggable')).toBe('true');
      mode.value = 'read';
      await nextTick();
      expect(root.attributes('draggable')).toBe('false');
    });

    it('shows drag handle only in build mode', async () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('.drag-handle').exists()).toBe(true);
      mode.value = 'read';
      await nextTick();
      expect(wrapper.find('.drag-handle').exists()).toBe(false);
    });

    it('adds former-draggable and padding classes in build mode', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      const classes = wrapper.find('[data-node="node-1"]').classes();
      expect(classes).toContain('former-draggable');
      expect(classes).toContain('p-2');
    });

    it('applies selected-node border class when selectedNode._id equals node._id in build mode', () => {
      const node: InternalSchemaNode = { _id: 'same-id', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(node);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      const classes = wrapper.find('[data-node="same-id"]').classes();
      expect(classes).toContain('border-2');
      expect(classes).toContain('!border-blue-600');
    });

    it('applies hidden-in-build background class when build mode and isShown is false', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
            showIf: () => false,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      const classes = wrapper.find('[data-node="node-1"]').classes();
      expect(classes).toContain('bg-zinc-300');
      expect(classes).toContain('dark:bg-zinc-700');
    });

    it('applies invalid-node border class when isNodeValid returns false in build mode', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: '', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({});
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = (propsNode, value) =>
        propsNode.name === '$name' && value === '' ? 'required' : true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      const classes = wrapper.find('[data-node="node-1"]').classes();
      expect(classes).toContain('border-2');
      expect(classes).toContain('border-red-500');
    });

    it('does not apply build-only classes outside build mode', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: '', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({});
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('read');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = (propsNode, value) =>
        propsNode.name === '$name' && value === '' ? 'required' : true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      const classes = wrapper.find('[data-node="node-1"]').classes();
      expect(classes).not.toContain('former-draggable');
      expect(classes).not.toContain('p-2');
      expect(classes).not.toContain('!border-blue-600');
      expect(classes).not.toContain('border-red-500');
    });
  });

  describe('click behavior', () => {
    it('sets selectedNode to current node on root click', async () => {
      const node: InternalSchemaNode = { _id: 'clicked-id', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      await wrapper.find('[data-node="clicked-id"]').trigger('click');
      expect(selectedNode.value?._id).toBe('clicked-id');
    });

    it('stops click propagation on root click', async () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const parentClickSpy = vi.fn();
      const host = document.createElement('div');
      document.body.appendChild(host);
      host.addEventListener('click', parentClickSpy);
      const wrapper = mount(FormNode, {
        attachTo: host,
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      await wrapper.find('[data-node="node-1"]').trigger('click');
      expect(parentClickSpy).not.toHaveBeenCalled();
      wrapper.unmount();
      host.remove();
    });
  });

  describe('drag behavior', () => {
    it('calls setDragEventData on dragstart with formId, discriminator node_id and node._id', async () => {
      const node: InternalSchemaNode = { _id: 'drag-id', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-xyz');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      await wrapper.find('[data-node="drag-id"]').trigger('dragstart');
      expect(setDragEventDataSpy).toHaveBeenCalledWith(
        expect.anything(),
        'form-xyz',
        'node_id',
        'drag-id',
      );
    });

    it('stops dragstart propagation on root dragstart', async () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const parentDragSpy = vi.fn();
      const host = document.createElement('div');
      document.body.appendChild(host);
      host.addEventListener('dragstart', parentDragSpy);
      const wrapper = mount(FormNode, {
        attachTo: host,
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      await wrapper.find('[data-node="node-1"]').trigger('dragstart');
      expect(parentDragSpy).not.toHaveBeenCalled();
      wrapper.unmount();
      host.remove();
    });

    it('does not call setDragEventData when dragstart is not triggered', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(setDragEventDataSpy).not.toHaveBeenCalled();
    });
  });

  describe('injection and provide contract', () => {
    it('provides node ref for descendants via provide("node", nodeRef)', () => {
      const node: InternalSchemaNode = { _id: 'provided-id', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-slot-node-id]').attributes('data-slot-node-id')).toBe('provided-id');
    });

    it('uses injected mode ref to drive build/read behavior reactively', async () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('.drag-handle').exists()).toBe(true);
      mode.value = 'read';
      await nextTick();
      expect(wrapper.find('.drag-handle').exists()).toBe(false);
    });

    it('uses injected selectedNode ref reactively for class updates', async () => {
      const node: InternalSchemaNode = { _id: 'sel-id', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            validator,
            components: TEXT_COMPONENTS,
            mode,
            selectedNode,
            formId,
            data,
            validityMap,
          },
        },
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-node="sel-id"]').classes()).not.toContain('!border-blue-600');
      selectedNode.value = node;
      await nextTick();
      expect(wrapper.find('[data-node="sel-id"]').classes()).toContain('!border-blue-600');
    });
  });

  describe('error paths (required injections)', () => {
    it('throws when validator injection is missing', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: {} };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      expect(() =>
        mount(FormNode, {
          props: { node },
          global: {
            provide: {
              components: TEXT_COMPONENTS,
              mode,
              selectedNode,
              formId,
              data,
              validityMap,
            },
          },
        }),
      ).toThrow('Please provide a value for validator');
    });

    it('throws when components injection is missing', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: {} };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      expect(() =>
        mount(FormNode, {
          props: { node },
          global: {
            provide: {
              validator,
              mode,
              selectedNode,
              formId,
              data,
              validityMap,
            },
          },
        }),
      ).toThrow('Please provide a value for components');
    });

    it('throws when mode injection is missing', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: {} };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const validator: Validator = () => true;
      expect(() =>
        mount(FormNode, {
          props: { node },
          global: {
            provide: {
              validator,
              components: TEXT_COMPONENTS,
              selectedNode,
              formId,
              data,
              validityMap,
            },
          },
        }),
      ).toThrow('Please provide a value for mode');
    });

    it('throws when selectedNode injection is missing', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: {} };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const formId = ref('form-123');
      const validator: Validator = () => true;
      expect(() =>
        mount(FormNode, {
          props: { node },
          global: {
            provide: {
              validator,
              components: TEXT_COMPONENTS,
              mode,
              formId,
              data,
              validityMap,
            },
          },
        }),
      ).toThrow('Please provide a value for selectedNode');
    });

    it('throws when formId injection is missing', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: {} };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const validator: Validator = () => true;
      expect(() =>
        mount(FormNode, {
          props: { node },
          global: {
            provide: {
              validator,
              components: TEXT_COMPONENTS,
              mode,
              selectedNode,
              data,
              validityMap,
            },
          },
        }),
      ).toThrow('Please provide a value for formId');
    });
  });
});
