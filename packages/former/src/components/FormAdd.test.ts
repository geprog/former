import type { FormComponents, Mode } from '~/types';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, provide, ref, type Ref, unref } from 'vue';
import { inject } from '~/compositions/injectProvide';

import FormAdd from './FormAdd.vue';

const mockSetDragEventData = vi.fn();

vi.mock('~/utils', () => ({
  setDragEventData: (...args: unknown[]) => mockSetDragEventData(...args),
}));

const FieldStub = defineComponent({
  name: 'FieldStub',
  props: {
    id: { type: String, required: true },
    mode: { type: String, required: true },
    modelValue: { type: [String, Number, Boolean, Object, Array], default: undefined },
  },
  template: `
    <div data-field-stub>
      <span data-field-id>{{ id }}</span>
      <span data-field-mode>{{ mode }}</span>
      <span data-field-model>{{ modelValue === undefined ? 'undefined' : String(modelValue) }}</span>
      <slot />
    </div>
  `,
});

const SlotInjectProbe = defineComponent({
  name: 'SlotInjectProbe',
  setup() {
    const data = inject('data');
    const schema = inject('schema');
    return () =>
      h('span', {
        'data-inject-data': JSON.stringify(unref(data)),
        'data-inject-schema': JSON.stringify(unref(schema)),
      });
  },
});

const mountedWrappers: Array<ReturnType<typeof mount>> = [];

function fixtureComponents(): FormComponents {
  const InternalStub = defineComponent({ name: 'InternalStub', template: '<div data-internal-never />' });
  return {
    text: {
      label: 'Text field',
      propsSchema: [],
      component: FieldStub,
    },
    number: {
      label: 'Number field',
      propsSchema: [],
      component: FieldStub,
    },
    hiddenInternal: {
      label: 'Should not list',
      propsSchema: [],
      component: InternalStub,
      internal: true,
    },
  };
}

function mountFormAdd(options?: {
  mode?: Ref<Mode>;
  formId?: Ref<string>;
  components?: FormComponents;
  withSlotProbe?: boolean;
}) {
  const mode = options?.mode ?? ref<Mode>('build');
  const formId = options?.formId ?? ref('form-1');
  const components = options?.components ?? fixtureComponents();

  const Parent = defineComponent({
    setup() {
      provide('components', components);
      provide('mode', mode);
      provide('formId', formId);
      return () =>
        h(FormAdd, null, {
          default: () => (options?.withSlotProbe ? h(SlotInjectProbe) : undefined),
        });
    },
  });

  const wrapper = mount(Parent, { attachTo: document.body });
  mountedWrappers.push(wrapper);
  return { wrapper, mode, formId, components };
}

describe('component FormAdd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const w of mountedWrappers.splice(0)) {
      w.unmount();
    }
  });

  describe('visibility', () => {
    it('shows palette in build mode', () => {
      const { wrapper } = mountFormAdd({ mode: ref<Mode>('build') });
      expect(wrapper.find('.drag-handle').exists()).toBe(true);
      expect(wrapper.text()).toContain('Text field');
    });

    it('hides palette in read mode', () => {
      const { wrapper } = mountFormAdd({ mode: ref<Mode>('read') });
      expect(wrapper.find('.drag-handle').exists()).toBe(false);
      expect(wrapper.text()).not.toContain('Text field');
    });

    it('hides palette in edit mode', () => {
      const { wrapper } = mountFormAdd({ mode: ref<Mode>('edit') });
      expect(wrapper.find('.drag-handle').exists()).toBe(false);
      expect(wrapper.text()).not.toContain('Text field');
    });

    it('hides palette when mode changes away from build', async () => {
      const mode = ref<Mode>('build');
      const { wrapper } = mountFormAdd({ mode });
      expect(wrapper.find('.drag-handle').exists()).toBe(true);
      mode.value = 'edit';
      await nextTick();
      expect(wrapper.find('.drag-handle').exists()).toBe(false);
    });
  });

  describe('catalog and previews', () => {
    it('omits internal component types', () => {
      const { wrapper } = mountFormAdd();
      expect(wrapper.text()).not.toContain('Should not list');
      expect(wrapper.find('[data-internal-never]').exists()).toBe(false);
    });

    it('renders labels for each public type', () => {
      const { wrapper } = mountFormAdd();
      expect(wrapper.text()).toContain('Text field');
      expect(wrapper.text()).toContain('Number field');
    });

    it('passes id, mode, and undefined modelValue to each preview field', () => {
      const { wrapper } = mountFormAdd();
      const stubs = wrapper.findAll('[data-field-stub]');
      expect(stubs).toHaveLength(2);
      expect(stubs[0]!.find('[data-field-id]').text()).toBe('text');
      expect(stubs[0]!.find('[data-field-mode]').text()).toBe('build');
      expect(stubs[0]!.find('[data-field-model]').text()).toBe('undefined');
      expect(stubs[1]!.find('[data-field-id]').text()).toBe('number');
      expect(stubs[1]!.find('[data-field-mode]').text()).toBe('build');
      expect(stubs[1]!.find('[data-field-model]').text()).toBe('undefined');
    });

    it('renders default slot inside each preview field', () => {
      const { wrapper } = mountFormAdd({ withSlotProbe: true });
      const probes = wrapper.findAll('[data-inject-data]');
      expect(probes).toHaveLength(2);
    });

    it('provides empty data and schema to preview descendants', () => {
      const { wrapper } = mountFormAdd({ withSlotProbe: true });
      const first = wrapper.find('[data-inject-data]');
      expect(first.attributes('data-inject-data')).toBe('{}');
      expect(first.attributes('data-inject-schema')).toBe('[]');
    });

    it('sets draggable on each palette row', () => {
      const { wrapper } = mountFormAdd();
      const draggables = wrapper.findAll('[draggable="true"]');
      expect(draggables).toHaveLength(2);
    });
  });

  describe('drag behavior', () => {
    it('does not call setDragEventData until dragstart', () => {
      mountFormAdd();
      expect(mockSetDragEventData).not.toHaveBeenCalled();
    });

    it('calls setDragEventData with formId, new_node_type, and registry key on dragstart', async () => {
      const { wrapper } = mountFormAdd({ formId: ref('my-form') });
      const rows = wrapper.findAll('[draggable="true"]');
      await rows[0]!.trigger('dragstart');
      expect(mockSetDragEventData).toHaveBeenCalledTimes(1);
      expect(mockSetDragEventData).toHaveBeenCalledWith(expect.anything(), 'my-form', 'new_node_type', 'text');
      mockSetDragEventData.mockClear();
      await rows[1]!.trigger('dragstart');
      expect(mockSetDragEventData).toHaveBeenCalledWith(expect.anything(), 'my-form', 'new_node_type', 'number');
    });

    it('uses current formId ref value when dragstart fires', async () => {
      const formId = ref('form-a');
      const { wrapper } = mountFormAdd({ formId });
      await wrapper.find('[draggable="true"]').trigger('dragstart');
      expect(mockSetDragEventData).toHaveBeenCalledWith(expect.anything(), 'form-a', 'new_node_type', 'text');
      mockSetDragEventData.mockClear();
      formId.value = 'form-b';
      await wrapper.find('[draggable="true"]').trigger('dragstart');
      expect(mockSetDragEventData).toHaveBeenCalledWith(expect.anything(), 'form-b', 'new_node_type', 'text');
    });
  });
});
