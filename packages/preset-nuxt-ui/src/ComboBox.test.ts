import type { FormComponents, FormData, Mode, SchemaNode } from '@former-ui/former';
import { Former } from '@former-ui/former';
import UInputMenu from '@nuxt/ui/components/InputMenu.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { type Component, nextTick, ref } from 'vue';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { createFormComponents } from './formComponents';

// icons are loaded from the network, which isn't needed here
vi.mock('@nuxt/ui/runtime/vue/components/Icon.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return { default: defineComponent(() => () => h('span')) };
});

const components: FormComponents = { combo_box: createFormComponents(key => key).combo_box };

const schema: SchemaNode[] = [
  { type: 'combo_box', name: 'fruit', props: { options: [{ value: 'apple', label: 'Apple' }, { value: 'pear' }] } },
];

// renders the real input menu to check how it displays values that are not one of its items
function mountComboBox(initialData: FormData, mode: Mode = 'edit') {
  const data = ref<FormData>(initialData);
  const wrapper = mount(Former, {
    props: {
      schema,
      'data': data.value,
      'onUpdate:data': (value: FormData) => (data.value = value),
      components,
      mode,
    },
    global: { components: { ...nuxtUiStubs, UInputMenu } },
  });
  return { wrapper, data };
}

function inputValue(wrapper: ReturnType<typeof mountComboBox>['wrapper']) {
  return (wrapper.find('input').element as HTMLInputElement).value;
}

describe('combo box', () => {
  it('shows the label of a selected option', () => {
    const { wrapper } = mountComboBox({ fruit: 'apple' });

    expect(inputValue(wrapper)).toBe('Apple');
  });

  it('shows the technical value of an option without label', () => {
    const { wrapper } = mountComboBox({ fruit: 'pear' });

    expect(inputValue(wrapper)).toBe('pear');
  });

  it('shows a custom value that is not one of the options', () => {
    const { wrapper } = mountComboBox({ fruit: 'banana' });

    expect(inputValue(wrapper)).toBe('banana');
  });

  it('shows a custom value in read mode', () => {
    const { wrapper } = mountComboBox({ fruit: 'banana' }, 'read');

    expect(inputValue(wrapper)).toBe('banana');
  });

  it('stores and shows a created value', async () => {
    const { wrapper, data } = mountComboBox({});

    wrapper.getComponent(UInputMenu as Component).vm.$emit('create', '  banana ');
    await nextTick();

    expect(data.value.fruit).toBe('banana');
    expect(inputValue(wrapper)).toBe('banana');
  });
});
