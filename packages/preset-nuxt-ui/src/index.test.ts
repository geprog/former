import type { FormData, SchemaNode } from '@former-ui/former';
import type { Component } from 'vue';
import { Former } from '@former-ui/former';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { createFormComponents } from './formComponents';
import { useFormComponents } from './index';

const components = createFormComponents(key => key);
const types = Object.keys(components) as (keyof typeof components)[];

function declaredProps(component: Component) {
  return Object.keys((component as { props?: Record<string, unknown> }).props ?? {});
}

describe('form components', () => {
  it.each(types)('%s declares a prop for each of its settings', (type) => {
    const { component, propsSchema } = components[type];
    const settings = (propsSchema as SchemaNode[]).map(node => node.name).filter(name => name !== '$name');

    expect(declaredProps(component)).toEqual(expect.arrayContaining(settings));
  });

  it.each(types)('%s does not pass props it does not declare to the rendered elements', (type) => {
    const schema: SchemaNode[] = [{ type, name: 'field', props: { appSpecific: 'not-for-the-component' } }];
    const wrapper = mount(Former, {
      props: { schema, data: {} as FormData, components, mode: 'edit' },
      global: { components: nuxtUiStubs },
    });

    expect(wrapper.html()).not.toContain('not-for-the-component');
  });

  it.each([
    ['text', { placeholder: 'Enter text' }, 'UInput', 'placeholder="Enter text"'],
    ['number', { placeholder: 'Enter number' }, 'UInputNumber', 'placeholder="Enter number"'],
    ['select', { placeholder: 'Choose' }, 'USelect', 'placeholder="Choose"'],
    ['combo_box', { placeholder: 'Choose' }, 'UInputMenu', 'placeholder="Choose"'],
    ['textarea', { placeholder: 'Enter text' }, 'UTextarea', 'placeholder="Enter text"'],
    ['textarea', { rows: 5 }, 'UTextarea', 'rows="5"'],
    ['checkbox', { label: 'Accept' }, 'UCheckbox', 'label="Accept"'],
    ['checkbox', { required: true }, 'UCheckbox', 'required="true"'],
    ['switch', { label: 'Enable' }, 'USwitch', 'label="Enable"'],
    ['switch', { required: true }, 'USwitch', 'required="true"'],
    ['radio_group', { required: true }, 'URadioGroup', 'required="true"'],
  ] as const)('%s passes %o to %s', (type, props, stub, attribute) => {
    const schema: SchemaNode[] = [{ type, name: 'field', props }];
    const wrapper = mount(Former, {
      props: { schema, data: {} as FormData, components, mode: 'edit' },
      global: { components: nuxtUiStubs },
    });

    expect(wrapper.find(`[data-stub="${stub}"]`).html()).toContain(attribute);
  });

  it('has an english text for each text key', async () => {
    const { default: en } = await import('./locales/en.json');
    const keys = new Set<string>();
    createFormComponents((key) => {
      keys.add(key);
      return key;
    });

    expect(Object.keys(en)).toEqual(expect.arrayContaining([...keys]));
  });

  it('translates the labels with the i18n instance of the app and follows its locale', async () => {
    const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: { text_field: 'Text' }, de: { text_field: 'Textfeld' } } });
    let components: ReturnType<typeof useFormComponents> | undefined;
    mount(defineComponent({
      setup() {
        components = useFormComponents();
        return () => h('div');
      },
    }), { global: { plugins: [i18n] } });

    expect(components?.value.text.label).toBe('Text');

    i18n.global.locale.value = 'de';
    await nextTick();

    expect(components?.value.text.label).toBe('Textfeld');
  });

  it.each([
    [undefined, 2],
    [3, 3],
  ])('columns with cols %o render %i columns', (cols, count) => {
    const schema: SchemaNode[] = [{ type: 'columns', props: cols === undefined ? {} : { cols } }];
    const wrapper = mount(Former, {
      props: { schema, data: {} as FormData, components, mode: 'edit' },
      global: { components: nuxtUiStubs },
    });

    expect(wrapper.findAll('.flex-grow')).toHaveLength(count);
  });

  it('presets the column count to 2 in the settings', () => {
    expect(components.columns.propsSchema.find(node => node.name === 'cols')?.props?.preset).toBe(2);
  });

  describe('columns in read mode', () => {
    const schema: SchemaNode[] = [{
      type: 'columns',
      props: { cols: 2, label: 'Columns' },
      children: { 'column-0': [{ type: 'text', name: 'a' }], 'column-1': [{ type: 'text', name: 'b' }] },
    }];

    function mountColumns(data: FormData, columnsSchema = schema) {
      return mount(Former, {
        props: { schema: columnsSchema, data, components, mode: 'read' },
        global: { components: nuxtUiStubs },
      });
    }

    it('are shown when a child has a value', () => {
      expect(mountColumns({ b: 'value' }).find('[data-label="Columns"]').exists()).toBe(true);
    });

    it('are hidden when only fields outside of them have a value', () => {
      expect(mountColumns({ other: 'value', a: null, b: '' }).find('[data-label="Columns"]').exists()).toBe(false);
    });

    it('are shown when they contain an image', () => {
      const withImage: SchemaNode[] = [{ ...schema[0]!, children: { 'column-0': [{ type: 'image' }] } }];

      expect(mountColumns({}, withImage).find('[data-label="Columns"]').exists()).toBe(true);
    });

    it('are hidden when a group in them only has cleared fields', () => {
      const withGroup: SchemaNode[] = [{ ...schema[0]!, children: { 'column-0': [{ type: 'group', name: 'g', children: [{ type: 'text', name: 'a' }] }] } }];

      expect(mountColumns({ g: { a: null } }, withGroup).find('[data-label="Columns"]').exists()).toBe(false);
    });

    it('are hidden when a repeater in them has no items', () => {
      const withRepeater: SchemaNode[] = [{ ...schema[0]!, children: { 'column-0': [{ type: 'repeater', name: 'r', children: [{ type: 'image' }] }] } }];

      expect(mountColumns({ r: [] }, withRepeater).find('[data-label="Columns"]').exists()).toBe(false);
    });

    it('are hidden when they only contain images hidden by their show if condition', () => {
      const withImage: SchemaNode[] = [{ ...schema[0]!, children: { 'column-0': [{ type: 'image', showIf: 'hidden' }] } }];
      const wrapper = mount(Former, {
        props: { schema: withImage, data: {}, components, mode: 'read', showIf: node => node.showIf !== 'hidden' },
        global: { components: nuxtUiStubs },
      });

      expect(wrapper.find('[data-label="Columns"]').exists()).toBe(false);
    });

    it('ignore children of columns beyond their count', () => {
      const withRemovedColumn: SchemaNode[] = [{ ...schema[0]!, props: { cols: 1, label: 'Columns' } }];

      expect(mountColumns({ b: 'value' }, withRemovedColumn).find('[data-label="Columns"]').exists()).toBe(false);
    });

    it('are hidden when a repeater in them has no data', () => {
      const withRepeater: SchemaNode[] = [{ ...schema[0]!, children: { 'column-0': [{ type: 'repeater', name: 'r', children: [{ type: 'image' }] }] } }];

      expect(mountColumns({}, withRepeater).find('[data-label="Columns"]').exists()).toBe(false);
    });
  });

  describe('group in read mode', () => {
    function mountGroup(data: FormData, children: SchemaNode[] = [{ type: 'text', name: 'a' }]) {
      const schema: SchemaNode[] = [{ type: 'group', name: 'g', props: { label: 'Group' }, children }];
      return mount(Former, {
        props: { schema, data, components, mode: 'read' },
        global: { components: nuxtUiStubs },
      });
    }

    it('is shown when a child has a value', () => {
      expect(mountGroup({ g: { a: 'value' } }).find('[data-label="Group"]').exists()).toBe(true);
    });

    it('is hidden when its fields were cleared', () => {
      expect(mountGroup({ g: { a: null } }).find('[data-label="Group"]').exists()).toBe(false);
    });

    it('is hidden when a repeater in it has no data', () => {
      expect(mountGroup({}, [{ type: 'repeater', name: 'r', children: [{ type: 'image' }] }]).find('[data-label="Group"]').exists()).toBe(false);
    });

    it('is shown when it contains an image', () => {
      expect(mountGroup({}, [{ type: 'image' }]).find('[data-label="Group"]').exists()).toBe(true);
    });
  });

  it.each(['checkbox', 'switch'] as const)('%s without preset does not change the data', async (type) => {
    let data: FormData = {};
    mount(Former, {
      props: { 'schema': [{ type, name: 'field' }], data, components, 'mode': 'edit', 'onUpdate:data': (value: FormData) => (data = value) },
      global: { components: nuxtUiStubs },
    });
    await nextTick();

    expect(data).toStrictEqual({});
  });

  it.each([['checkbox', 'UCheckbox'], ['switch', 'USwitch']] as const)('%s stores `true` when checked and clears the value when unchecked', async (type, stub) => {
    let data: FormData = {};
    const wrapper = mount(Former, {
      props: { 'schema': [{ type, name: 'field' }], data, components, 'mode': 'edit', 'onUpdate:data': (value: FormData) => (data = value) },
      global: { components: nuxtUiStubs },
    });

    wrapper.findComponent({ name: stub }).vm.$emit('update:modelValue', true);
    await nextTick();
    expect(data).toStrictEqual({ field: true });

    wrapper.findComponent({ name: stub }).vm.$emit('update:modelValue', false);
    await nextTick();
    expect(data).toStrictEqual({ field: null });
  });
});
