import type { FormData, SchemaNode } from '@former-ui/former';
import { Former } from '@former-ui/former';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { createFormComponents } from './formComponents';

const components = createFormComponents(key => key);

// `FieldData` of former only knows lists of form data (e.g. of repeaters), while the checked options are a list of strings
function checked(values: string[]) {
  return values as unknown as FormData[];
}

const options = [
  { value: 'red', preset: true },
  { value: 'green' },
  { value: 'blue', preset: true },
];

function mountCheckboxGroup(initialData: FormData) {
  const data = ref<FormData>(initialData);
  const schema: SchemaNode[] = [
    {
      type: 'checkbox_group',
      name: 'colors',
      props: { options },
    },
  ];
  const wrapper = mount(Former, {
    props: {
      schema,
      'data': data.value,
      'onUpdate:data': (value: FormData) => (data.value = value),
      components,
      'mode': 'edit',
    },
    global: { components: nuxtUiStubs },
  });
  return { wrapper, data };
}

describe('checkbox group', () => {
  it('checks all preset options', async () => {
    const { data } = mountCheckboxGroup({});
    await nextTick();

    expect(data.value.colors).toStrictEqual(['red', 'blue']);
  });

  it('stores the checked options', async () => {
    const { wrapper, data } = mountCheckboxGroup({ colors: null });

    wrapper.findComponent({ name: 'UCheckboxGroup' }).vm.$emit('update:modelValue', ['green']);
    await nextTick();

    expect(data.value.colors).toStrictEqual(['green']);
  });

  it('clears the value when no option is checked', async () => {
    const { wrapper, data } = mountCheckboxGroup({
      colors: checked(['green']),
    });

    wrapper.findComponent({ name: 'UCheckboxGroup' }).vm.$emit('update:modelValue', []);
    await nextTick();

    expect(data.value.colors).toBeNull();
  });
});
