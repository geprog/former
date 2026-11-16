import type { FormComponents, FormData } from '@former-ui/former';
import { Former } from '@former-ui/former';
import UInput from '@nuxt/ui/components/Input.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { createFormComponents } from './formComponents';

// icons are loaded from the network, which isn't needed here
vi.mock('@nuxt/ui/runtime/vue/components/Icon.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return { default: defineComponent(() => () => h('span')) };
});

// renders the trigger and the content, as the real popover only renders its content when it is open
const UPopover = defineComponent({
  name: 'UPopover',
  setup: (_, { slots }) => () => h('div', [slots.default?.(), slots.content?.()]),
});

const components: FormComponents = { color: createFormComponents(key => key).color };

function mountColor(initialData: FormData) {
  const data = ref<FormData>(initialData);
  const wrapper = mount(Former, {
    props: {
      'schema': [{ type: 'color', name: 'color' }],
      'data': data.value,
      'onUpdate:data': (value: FormData) => (data.value = value),
      components,
      'mode': 'edit',
    },
    global: { components: { ...nuxtUiStubs, UInput, UPopover } },
  });
  return { wrapper, data };
}

describe('color', () => {
  it('shows the color in the swatch', () => {
    const { wrapper } = mountColor({ color: '#00C16A' });

    expect(wrapper.find('button').attributes('style')).toContain('background-color: #00C16A');
  });

  it('stores the color chosen with the picker', async () => {
    const { wrapper, data } = mountColor({});

    wrapper.findComponent({ name: 'UColorPicker' }).vm.$emit('update:modelValue', '#FF0000');
    await nextTick();

    expect(data.value.color).toBe('#FF0000');
  });

  it('stores a typed color', async () => {
    const { wrapper, data } = mountColor({});

    await wrapper.find('input').setValue('#123456');

    expect(data.value.color).toBe('#123456');
  });
});
