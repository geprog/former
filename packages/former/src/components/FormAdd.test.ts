import type { FormComponents, Mode } from '~/types';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref, unref } from 'vue';
import { inject } from '~/compositions/injectProvide';
import * as utils from '~/utils';

import FormAdd from './FormAdd.vue';

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

const InternalStub = defineComponent({ name: 'InternalStub', template: '<div data-internal-never />' });

const ADD_COMPONENTS: FormComponents = {
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

describe('component FormAdd', () => {
  let setDragEventDataSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setDragEventDataSpy = vi.spyOn(utils, 'setDragEventData').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('visibility', () => {
    it('shows palette in build mode', () => {
      const mode = ref<Mode>('build');
      const formId = ref('form-1');
      const components = ADD_COMPONENTS;
      const wrapper = mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
      });
      expect(wrapper.text()).not.toBe('');
    });

    it('hides palette in read mode', () => {
      const mode = ref<Mode>('read');
      const formId = ref('form-1');
      const components = ADD_COMPONENTS;
      const wrapper = mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
      });
      expect(wrapper.text()).toBe('');
    });

    it('hides palette in edit mode', () => {
      const mode = ref<Mode>('edit');
      const formId = ref('form-1');
      const components = ADD_COMPONENTS;
      const wrapper = mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
      });
      expect(wrapper.text()).toBe('');
    });

    it('hides palette when mode changes away from build', async () => {
      const mode = ref<Mode>('build');
      const formId = ref('form-1');
      const components = ADD_COMPONENTS;
      const wrapper = mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
      });
      expect(wrapper.find('.drag-handle').exists()).toBe(true);
      mode.value = 'edit';
      await nextTick();
      expect(wrapper.text()).toBe('');
    });
  });

  describe('catalog and previews', () => {
    it('omits internal component types', () => {
      const mode = ref<Mode>('build');
      const formId = ref('form-1');
      const components = ADD_COMPONENTS;
      const wrapper = mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
      });
      expect(wrapper.text()).not.toContain('Should not list');
      expect(wrapper.find('[data-internal-never]').exists()).toBe(false);
    });

    it('renders labels for each public type', () => {
      const mode = ref<Mode>('build');
      const formId = ref('form-1');
      const components = ADD_COMPONENTS;
      const wrapper = mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
      });
      expect(wrapper.text()).toContain('Text field');
      expect(wrapper.text()).toContain('Number field');
    });

    it('passes id, mode, and undefined modelValue to each preview field', () => {
      const mode = ref<Mode>('build');
      const formId = ref('form-1');
      const components = ADD_COMPONENTS;
      const wrapper = mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
      });
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
      const mode = ref<Mode>('build');
      const formId = ref('form-1');
      const components = ADD_COMPONENTS;
      const wrapper = mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
        slots: { default: () => h(SlotInjectProbe) },
      });
      const probes = wrapper.findAll('[data-inject-data]');
      expect(probes).toHaveLength(2);
    });

    it('provides empty data and schema to preview descendants', () => {
      const mode = ref<Mode>('build');
      const formId = ref('form-1');
      const components = ADD_COMPONENTS;
      const wrapper = mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
        slots: { default: () => h(SlotInjectProbe) },
      });
      const first = wrapper.find('[data-inject-data]');
      expect(first.attributes('data-inject-data')).toBe('{}');
      expect(first.attributes('data-inject-schema')).toBe('[]');
    });

    it('sets draggable on each palette row', () => {
      const mode = ref<Mode>('build');
      const formId = ref('form-1');
      const components = ADD_COMPONENTS;
      const wrapper = mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
      });
      expect(wrapper.findAll('[draggable="true"]')).toHaveLength(2);
    });
  });

  describe('drag behavior', () => {
    it('does not call setDragEventData until dragstart', () => {
      const mode = ref<Mode>('build');
      const formId = ref('form-1');
      const components = ADD_COMPONENTS;
      mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
      });
      expect(setDragEventDataSpy).not.toHaveBeenCalled();
    });

    it('calls setDragEventData with formId, new_node_type, and registry key on dragstart', async () => {
      const mode = ref<Mode>('build');
      const formId = ref('my-form');
      const components = ADD_COMPONENTS;
      const wrapper = mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
      });
      const rows = wrapper.findAll('[draggable="true"]');
      await rows[0]!.trigger('dragstart');
      expect(setDragEventDataSpy).toHaveBeenCalledTimes(1);
      expect(setDragEventDataSpy).toHaveBeenCalledWith(expect.anything(), 'my-form', 'new_node_type', 'text');
      setDragEventDataSpy.mockClear();
      await rows[1]!.trigger('dragstart');
      expect(setDragEventDataSpy).toHaveBeenCalledWith(expect.anything(), 'my-form', 'new_node_type', 'number');
    });

    it('uses current formId ref value when dragstart fires', async () => {
      const mode = ref<Mode>('build');
      const formId = ref('form-a');
      const components = ADD_COMPONENTS;
      const wrapper = mount(FormAdd, {
        attachTo: document.body,
        global: {
          provide: { components, mode, formId },
        },
      });
      await wrapper.find('[draggable="true"]').trigger('dragstart');
      expect(setDragEventDataSpy).toHaveBeenCalledWith(expect.anything(), 'form-a', 'new_node_type', 'text');
      setDragEventDataSpy.mockClear();
      formId.value = 'form-b';
      await wrapper.find('[draggable="true"]').trigger('dragstart');
      expect(setDragEventDataSpy).toHaveBeenCalledWith(expect.anything(), 'form-b', 'new_node_type', 'text');
    });
  });
});
