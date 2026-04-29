import type { FormComponents, InternalSchemaNode, Validator } from '~/types';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, inject, nextTick, provide, ref, type Ref } from 'vue';
import FormNode from './FormNode.vue';

const mockUseNode = vi.fn();
const mockIsNodeValid = vi.fn();
const mockSetDragEventData = vi.fn();

vi.mock('~/compositions/useNode', () => ({
  default: (...args: unknown[]) => mockUseNode(...args),
}));

vi.mock('~/compositions/useSchema', () => ({
  isNodeValid: (...args: unknown[]) => mockIsNodeValid(...args),
}));

vi.mock('~/utils', () => ({
  setDragEventData: (...args: unknown[]) => mockSetDragEventData(...args),
}));

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

function createNode(overrides: Partial<InternalSchemaNode> = {}): InternalSchemaNode {
  return {
    _id: 'node-1',
    type: 'text',
    name: 'field',
    props: { custom: 'from-node-props' },
    ...overrides,
  };
}

function createComponentsFixture(): FormComponents {
  return {
    text: {
      label: 'Text',
      propsSchema: [{ type: 'text', name: '$name' }],
      component: DynamicComponent,
    },
  };
}

function createUseNodeState(overrides?: {
  component?: unknown;
  error?: string | undefined;
  isShown?: boolean;
  modelValue?: unknown;
}) {
  return {
    component: computed(() =>
      Object.prototype.hasOwnProperty.call(overrides ?? {}, 'component')
        ? overrides?.component
        : DynamicComponent,
    ),
    error: computed(() => overrides?.error),
    isShown: computed(() => overrides?.isShown ?? true),
    modelValue: ref(overrides?.modelValue ?? 'initial-value'),
  };
}

function mountFormNode(options?: {
  node?: InternalSchemaNode;
  mode?: 'build' | 'read' | 'edit';
  selectedNode?: InternalSchemaNode | undefined;
  formId?: string;
  validator?: Validator;
  components?: FormComponents;
  provideValidator?: boolean;
  provideComponents?: boolean;
  provideMode?: boolean;
  provideSelectedNode?: boolean;
  provideFormId?: boolean;
  useNodeState?: ReturnType<typeof createUseNodeState>;
  isNodeValidFlag?: boolean;
  withParentClickSpy?: boolean;
  withParentDragSpy?: boolean;
}) {
  const node = options?.node ?? createNode();
  const mode = ref(options?.mode ?? 'build');
  const selectedNode = ref<InternalSchemaNode | undefined>(options?.selectedNode);
  const formId = ref(options?.formId ?? 'form-123');
  const validator: Validator = options?.validator ?? (() => true);
  const components = options?.components ?? createComponentsFixture();
  const useNodeState = options?.useNodeState ?? createUseNodeState();

  mockUseNode.mockReturnValue(useNodeState);
  mockIsNodeValid.mockReturnValue(options?.isNodeValidFlag ?? true);

  const parentClickSpy = vi.fn();
  const parentDragSpy = vi.fn();

  const Parent = defineComponent({
    components: { FormNode, SlotProbe },
    setup() {
      if (options?.provideValidator !== false) {
        provide('validator', validator);
      }
      if (options?.provideComponents !== false) {
        provide('components', components);
      }
      if (options?.provideMode !== false) {
        provide('mode', mode);
      }
      if (options?.provideSelectedNode !== false) {
        provide('selectedNode', selectedNode);
      }
      if (options?.provideFormId !== false) {
        provide('formId', formId);
      }
      return { node, mode, selectedNode, parentClickSpy, parentDragSpy };
    },
    template: `
      <div data-parent @click="parentClickSpy" @dragstart="parentDragSpy">
        <FormNode :node="node">
          <SlotProbe />
        </FormNode>
      </div>
    `,
  });

  const wrapper = mount(Parent);
  return { wrapper, node, mode, selectedNode, formId, parentClickSpy, parentDragSpy, useNodeState };
}

describe('component FormNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility and root rendering', () => {
    it('renders root wrapper when isShown is true', () => {
      const { wrapper } = mountFormNode({ useNodeState: createUseNodeState({ isShown: true }) });
      expect(wrapper.find('[data-node="node-1"]').exists()).toBe(true);
    });

    it('renders root wrapper in build mode even when isShown is false', () => {
      const { wrapper } = mountFormNode({ mode: 'build', useNodeState: createUseNodeState({ isShown: false }) });
      expect(wrapper.find('[data-node="node-1"]').exists()).toBe(true);
    });

    it('does not render root wrapper when isShown is false and mode is not build', () => {
      const { wrapper } = mountFormNode({ mode: 'read', useNodeState: createUseNodeState({ isShown: false }) });
      expect(wrapper.find('[data-node="node-1"]').exists()).toBe(false);
    });
  });

  describe('component resolution', () => {
    it('renders the resolved dynamic component when component is provided', () => {
      const { wrapper } = mountFormNode({ useNodeState: createUseNodeState({ component: DynamicComponent }) });
      expect(wrapper.find('[data-dynamic]').exists()).toBe(true);
    });

    it('renders fallback text when component is missing', () => {
      const { wrapper } = mountFormNode({ useNodeState: createUseNodeState({ component: null }) });
      expect(wrapper.text()).toContain('Component type not found!');
    });
  });

  describe('dynamic component bindings', () => {
    it('passes node props to the rendered component', () => {
      const { wrapper } = mountFormNode({ node: createNode({ props: { custom: 'abc' } }) });
      expect(wrapper.find('[data-custom]').text()).toBe('abc');
    });

    it('passes id as node._id to the rendered component', () => {
      const { wrapper } = mountFormNode({ node: createNode({ _id: 'node-42' }) });
      expect(wrapper.find('[data-id]').text()).toBe('node-42');
    });

    it('passes mode prop to the rendered component', () => {
      const { wrapper } = mountFormNode({ mode: 'read' });
      expect(wrapper.find('[data-mode]').text()).toBe('read');
    });

    it('passes error prop from useNode to the rendered component', () => {
      const { wrapper } = mountFormNode({ useNodeState: createUseNodeState({ error: 'bad input' }) });
      expect(wrapper.find('[data-error]').text()).toBe('bad input');
    });

    it('binds v-model to useNode modelValue', async () => {
      const state = createUseNodeState({ modelValue: 'before' });
      const { wrapper } = mountFormNode({ useNodeState: state });
      expect(wrapper.find('[data-model]').text()).toBe('before');
      await wrapper.find('[data-update]').trigger('click');
      await nextTick();
      expect((state.modelValue as Ref<unknown>).value).toBe('from-child');
    });

    it('renders slot content inside the dynamic component', () => {
      const { wrapper } = mountFormNode();
      expect(wrapper.find('[data-slot-node-id]').exists()).toBe(true);
    });
  });

  describe('build mode visuals', () => {
    it('sets draggable=true only in build mode', async () => {
      const { wrapper, mode } = mountFormNode({ mode: 'build' });
      const root = wrapper.find('[data-node="node-1"]');
      expect(root.attributes('draggable')).toBe('true');
      mode.value = 'read';
      await nextTick();
      expect(root.attributes('draggable')).toBe('false');
    });

    it('shows drag handle only in build mode', async () => {
      const { wrapper, mode } = mountFormNode({ mode: 'build' });
      expect(wrapper.find('.drag-handle').exists()).toBe(true);
      mode.value = 'read';
      await nextTick();
      expect(wrapper.find('.drag-handle').exists()).toBe(false);
    });

    it('adds former-draggable and padding classes in build mode', () => {
      const { wrapper } = mountFormNode({ mode: 'build' });
      const classes = wrapper.find('[data-node="node-1"]').classes();
      expect(classes).toContain('former-draggable');
      expect(classes).toContain('p-2');
    });

    it('applies selected-node border class when selectedNode._id equals node._id in build mode', () => {
      const node = createNode({ _id: 'same-id' });
      const { wrapper } = mountFormNode({ mode: 'build', node, selectedNode: node });
      const classes = wrapper.find('[data-node="same-id"]').classes();
      expect(classes).toContain('border-2');
      expect(classes).toContain('!border-blue-600');
    });

    it('applies hidden-in-build background class when build mode and isShown is false', () => {
      const { wrapper } = mountFormNode({
        mode: 'build',
        useNodeState: createUseNodeState({ isShown: false }),
      });
      const classes = wrapper.find('[data-node="node-1"]').classes();
      expect(classes).toContain('bg-zinc-300');
      expect(classes).toContain('dark:bg-zinc-700');
    });

    it('applies invalid-node border class when isNodeValid returns false in build mode', () => {
      const { wrapper } = mountFormNode({ mode: 'build', isNodeValidFlag: false });
      const classes = wrapper.find('[data-node="node-1"]').classes();
      expect(classes).toContain('border-2');
      expect(classes).toContain('border-red-500');
    });

    it('does not apply build-only classes outside build mode', () => {
      const { wrapper } = mountFormNode({ mode: 'read', isNodeValidFlag: false });
      const classes = wrapper.find('[data-node="node-1"]').classes();
      expect(classes).not.toContain('former-draggable');
      expect(classes).not.toContain('p-2');
      expect(classes).not.toContain('!border-blue-600');
      expect(classes).not.toContain('border-red-500');
    });
  });

  describe('click behavior', () => {
    it('sets selectedNode to current node on root click', async () => {
      const node = createNode({ _id: 'clicked-id' });
      const { wrapper, selectedNode } = mountFormNode({ node, selectedNode: undefined });
      await wrapper.find('[data-node="clicked-id"]').trigger('click');
      expect(selectedNode.value?._id).toBe('clicked-id');
    });

    it('stops click propagation on root click', async () => {
      const { wrapper, parentClickSpy } = mountFormNode();
      await wrapper.find('[data-node="node-1"]').trigger('click');
      expect(parentClickSpy).not.toHaveBeenCalled();
    });
  });

  describe('drag behavior', () => {
    it('calls setDragEventData on dragstart with formId, discriminator node_id and node._id', async () => {
      const { wrapper } = mountFormNode({ formId: 'form-xyz', node: createNode({ _id: 'drag-id' }) });
      await wrapper.find('[data-node="drag-id"]').trigger('dragstart');
      expect(mockSetDragEventData).toHaveBeenCalledWith(
        expect.anything(),
        'form-xyz',
        'node_id',
        'drag-id',
      );
    });

    it('stops dragstart propagation on root dragstart', async () => {
      const { wrapper, parentDragSpy } = mountFormNode();
      await wrapper.find('[data-node="node-1"]').trigger('dragstart');
      expect(parentDragSpy).not.toHaveBeenCalled();
    });

    it('does not call setDragEventData when dragstart is not triggered', () => {
      mountFormNode();
      expect(mockSetDragEventData).not.toHaveBeenCalled();
    });
  });

  describe('injection and provide contract', () => {
    it('provides node ref for descendants via provide("node", nodeRef)', () => {
      const { wrapper } = mountFormNode({ node: createNode({ _id: 'provided-id' }) });
      expect(wrapper.find('[data-slot-node-id]').attributes('data-slot-node-id')).toBe('provided-id');
    });

    it('uses injected mode ref to drive build/read behavior reactively', async () => {
      const { wrapper, mode } = mountFormNode({ mode: 'build' });
      expect(wrapper.find('.drag-handle').exists()).toBe(true);
      mode.value = 'read';
      await nextTick();
      expect(wrapper.find('.drag-handle').exists()).toBe(false);
    });

    it('uses injected selectedNode ref reactively for class updates', async () => {
      const node = createNode({ _id: 'sel-id' });
      const { wrapper, selectedNode } = mountFormNode({ mode: 'build', node, selectedNode: undefined });
      expect(wrapper.find('[data-node="sel-id"]').classes()).not.toContain('!border-blue-600');
      selectedNode.value = node;
      await nextTick();
      expect(wrapper.find('[data-node="sel-id"]').classes()).toContain('!border-blue-600');
    });
  });

  describe('error paths (required injections)', () => {
    it('throws when validator injection is missing', () => {
      expect(() => mountFormNode({ provideValidator: false })).toThrow('Please provide a value for validator');
    });

    it('throws when components injection is missing', () => {
      expect(() => mountFormNode({ provideComponents: false })).toThrow('Please provide a value for components');
    });

    it('throws when mode injection is missing', () => {
      expect(() => mountFormNode({ provideMode: false })).toThrow('Please provide a value for mode');
    });

    it('throws when selectedNode injection is missing', () => {
      expect(() => mountFormNode({ provideSelectedNode: false })).toThrow('Please provide a value for selectedNode');
    });

    it('throws when formId injection is missing', () => {
      expect(() => mountFormNode({ provideFormId: false })).toThrow('Please provide a value for formId');
    });
  });
});
