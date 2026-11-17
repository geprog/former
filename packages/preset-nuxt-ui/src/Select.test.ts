import type { FormComponents, FormData, SchemaNode } from '@former-ui/former';
import { Former } from '@former-ui/former';
import USelectMenu from '@nuxt/ui/components/SelectMenu.vue';
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

const components: FormComponents = { select: createFormComponents(key => key).select };

const options = [{ value: 'apple', label: 'Apple', preset: true }, { value: 'pear' }, { value: 'plum', preset: true }];

// renders the real select menu to check how it shows the chosen options
function mountSelect(initialData: FormData, props: SchemaNode['props'] = {}) {
  const data = ref<FormData>(initialData);
  const wrapper = mount(Former, {
    props: {
      'schema': [{ type: 'select', name: 'fruits', props: { options, ...props } }],
      'data': data.value,
      'onUpdate:data': (value: FormData) => (data.value = value),
      components,
      'mode': 'edit',
    },
    global: { components: { ...nuxtUiStubs, USelectMenu } },
  });
  return { wrapper, data };
}

// `FieldData` of former only knows lists of form data (e.g. of repeaters), while the chosen options are a list of strings
function chosen(values: string[]) {
  return values as unknown as FormData[];
}

describe('select', () => {
  it('chooses the first preset option and shows its label', async () => {
    const { wrapper, data } = mountSelect({});
    await nextTick();

    expect(data.value.fruits).toBe('apple');
    expect(wrapper.text()).toContain('Apple');
  });

  it('chooses all preset options with multiple choice', async () => {
    const { wrapper, data } = mountSelect({}, { multiple: true });
    await nextTick();

    expect(data.value.fruits).toStrictEqual(['apple', 'plum']);
    expect(wrapper.text()).toContain('Apple, plum');
  });

  it('clears the value when no option is chosen', async () => {
    const { wrapper, data } = mountSelect({ fruits: chosen(['pear']) }, { multiple: true });

    wrapper.getComponent(USelectMenu as Component).vm.$emit('update:modelValue', []);
    await nextTick();

    expect(data.value.fruits).toBeNull();
  });

  it.each([
    [{ multiple: true }, 'pear', 'pear'],
    [{}, chosen(['pear', 'plum']), 'pear'],
  ])('with %o shows the value %o stored before `multiple` was toggled', (props, value, shown) => {
    const { wrapper } = mountSelect({ fruits: value }, props);

    expect(wrapper.text()).toContain(shown);
  });
});
