import type { FormComponents, InternalSchemaNode } from '~/types';
import { config, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, inject, markRaw, nextTick, ref, type Ref } from 'vue';
import { z } from 'zod';
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

const TEXT_COMPONENTS: Ref<FormComponents> = ref({
  text: {
    label: 'Text',
    propsSchema: [{ type: 'text', name: '$name', props: { required: true } }],
    component: markRaw(DynamicComponent),
    validation: ({ required, errorMessage }) => {
      if (errorMessage) {
        return z.never(errorMessage);
      }
      return required ? z.string().min(1, 'required') : undefined;
    },
  },
});

describe('component FormNode', () => {
  let setDragEventDataSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    config.global.provide = { texts: ref({ dragHint: 'hint', invalidSchema: 'Invalid schema' }) };
    vi.clearAllMocks();
    vi.restoreAllMocks();
    setDragEventDataSpy = vi.spyOn(utils, 'setDragEventData').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    config.global.provide = {};
  });

  describe('visibility and root rendering', () => {
    it('renders root wrapper when isShown is true', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'from-node-props' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
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
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
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

    it.each([
      ['read', { field: 'v' }, true],
      ['read', { field: null }, false],
      ['read', {}, false],
      ['edit', {}, true],
      ['build', {}, true],
    ] as const)('in %s mode with data %j renders the root wrapper: %s', (modeValue, dataValue, rendered) => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field' };
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
            components: TEXT_COMPONENTS,
            mode: ref(modeValue),
            selectedNode: ref(undefined),
            formId: ref('form-123'),
            data: ref({ ...dataValue }),
            validityMap: ref({}),
            showIf: () => true,
          },
        },
      });
      expect(wrapper.find('[data-node="node-1"]').exists()).toBe(rendered);
    });

    it('does not render root wrapper when isShown is false and mode is not build', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'from-node-props' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('read');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
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
      const wrapper = mount(FormNode, {
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
      const componentsNoView: Ref<FormComponents> = ref({
        text: {
          label: 'Text',
          propsSchema: [{ type: 'text', name: '$name' }],
          component: undefined as unknown as (typeof DynamicComponent),
        },
      });
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
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
      const wrapper = mount(FormNode, {
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
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-custom]').text()).toBe('abc');
    });

    it('does not pass cleared (null) node props to the rendered component', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: null } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const wrapper = mount(FormNode, {
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
      });
      expect(wrapper.findComponent(DynamicComponent).props('custom')).toBeUndefined();
    });

    it('passes id as node._id to the rendered component', () => {
      const node: InternalSchemaNode = { _id: 'node-42', type: 'text', name: 'field', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const wrapper = mount(FormNode, {
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
      const wrapper = mount(FormNode, {
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
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-mode]').text()).toBe('read');
    });

    it('passes error prop from useNode to the rendered component', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'field', props: { custom: 'x', errorMessage: 'bad input' } };
      const data = ref<Record<string, unknown>>({ field: 'v' });
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const wrapper = mount(FormNode, {
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
      const wrapper = mount(FormNode, {
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
      const wrapper = mount(FormNode, {
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
      const wrapper = mount(FormNode, {
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
      const wrapper = mount(FormNode, {
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
      const wrapper = mount(FormNode, {
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
      const wrapper = mount(FormNode, {
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
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: {
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
      const wrapper = mount(FormNode, {
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
        slots: { default: () => h(SlotProbe) },
      });
      const classes = wrapper.find('[data-node="node-1"]').classes();
      expect(classes).toContain('border-2');
      expect(classes).toContain('border-red-500');
    });

    it.each([
      ['throws', () => {
        throw new Error('Server not reachable');
      }],
      ['rejects', () => ({ '~standard': { version: 1, vendor: 'test', validate: () => Promise.reject(new Error('Server not reachable')) } })],
    ] as const)('shows the message of a props validation which %s in build mode', async (_, validation) => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'a' };
      const components = ref<FormComponents>({ text: { ...TEXT_COMPONENTS.value.text, validation: validation as FormComponents[string]['validation'] } });
      const mode = ref<'build' | 'read' | 'edit'>('build');
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: { components, mode, selectedNode: ref(), formId: ref('form-123'), data: ref({}), validityMap: ref({}) },
        },
      });
      await flushPromises();

      expect(wrapper.find('[data-props-error]').text()).toBe('Server not reachable');
      expect(wrapper.find('[data-node="node-1"]').classes()).toContain('border-red-500');

      mode.value = 'edit';
      await flushPromises();
      expect(wrapper.find('[data-props-error]').exists()).toBe(false);
    });

    it('shows a general message for invalid props, whose issues are shown in the props of the node', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: '' };
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: { components: TEXT_COMPONENTS, mode: ref('build'), selectedNode: ref(), formId: ref('form-123'), data: ref({}), validityMap: ref({}) },
        },
      });

      expect(wrapper.find('[data-node="node-1"]').classes()).toContain('border-red-500');
      expect(wrapper.find('[data-props-error]').text()).toBe('Invalid schema');
    });

    it('shows no message for valid props', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: 'a' };
      const wrapper = mount(FormNode, {
        props: { node },
        global: {
          provide: { components: TEXT_COMPONENTS, mode: ref('build'), selectedNode: ref(), formId: ref('form-123'), data: ref({}), validityMap: ref({}) },
        },
      });

      expect(wrapper.find('[data-node="node-1"]').classes()).not.toContain('border-red-500');
      expect(wrapper.find('[data-props-error]').exists()).toBe(false);
    });

    it('does not apply build-only classes outside build mode', () => {
      const node: InternalSchemaNode = { _id: 'node-1', type: 'text', name: '', props: { custom: 'x' } };
      const data = ref<Record<string, unknown>>({});
      const validityMap = ref<Record<string, boolean | undefined>>({});
      const mode = ref<'build' | 'read' | 'edit'>('read');
      const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
      const formId = ref('form-123');
      const wrapper = mount(FormNode, {
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
      const wrapper = mount(FormNode, {
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
      const parentClickSpy = vi.fn();
      const host = document.createElement('div');
      document.body.appendChild(host);
      host.addEventListener('click', parentClickSpy);
      const wrapper = mount(FormNode, {
        attachTo: host,
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
      const wrapper = mount(FormNode, {
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
      const parentDragSpy = vi.fn();
      const host = document.createElement('div');
      document.body.appendChild(host);
      host.addEventListener('dragstart', parentDragSpy);
      const wrapper = mount(FormNode, {
        attachTo: host,
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
      const wrapper = mount(FormNode, {
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
      const wrapper = mount(FormNode, {
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
      const wrapper = mount(FormNode, {
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
        slots: { default: () => h(SlotProbe) },
      });
      expect(wrapper.find('[data-node="sel-id"]').classes()).not.toContain('!border-blue-600');
      selectedNode.value = node;
      await nextTick();
      expect(wrapper.find('[data-node="sel-id"]').classes()).toContain('!border-blue-600');
    });
  });

  describe('error paths (required injections)', () => {
    it('throws when components injection is missing', () => {
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
      expect(() =>
        mount(FormNode, {
          props: { node },
          global: {
            provide: {
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
      expect(() =>
        mount(FormNode, {
          props: { node },
          global: {
            provide: {
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
      expect(() =>
        mount(FormNode, {
          props: { node },
          global: {
            provide: {
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
