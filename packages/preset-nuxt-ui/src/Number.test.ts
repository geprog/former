import type { FormComponents, FormData, SchemaNode } from '@former-ui/former';
import { Former } from '@former-ui/former';
import UInputNumber from '@nuxt/ui/components/InputNumber.vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { createFormComponents } from './formComponents';

// icons are loaded from the network, which isn't needed here
vi.mock('@nuxt/ui/runtime/vue/components/Icon.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return { default: defineComponent(() => () => h('span')) };
});

const components: FormComponents = { number: createFormComponents(key => key).number };

// renders the real input number to check how it rounds entered numbers
function mountNumber(props: SchemaNode['props']) {
  const data = ref<FormData>({});
  const wrapper = mount(Former, {
    props: {
      'schema': [{ type: 'number', name: 'value', props }],
      'data': data.value,
      'onUpdate:data': (value: FormData) => (data.value = value),
      components,
      'mode': 'edit',
    },
    global: { components: { ...nuxtUiStubs, UInputNumber } },
  });
  return { wrapper, data };
}

describe('number', () => {
  it.each([
    [2, 1.235, 1.24],
    [0, 1.6, 2],
    // without decimal places numbers are formatted with the default of `Intl.NumberFormat` (3 decimal places)
    [undefined, 1.2345, 1.235],
    [4, 1.2345, 1.2345],
  ])('with %o decimal places stores %o as %o', async (decimals, entered, stored) => {
    const { wrapper, data } = mountNumber({ decimals });
    const input = wrapper.find('input');

    await input.setValue(String(entered));
    await input.trigger('blur');
    await flushPromises();

    expect(data.value.value).toBe(stored);
  });

  it.each([
    [{ max: 10 }, 12, 12],
    [{ min: 5 }, 2, 2],
    // typed numbers are kept as they are, even with step snapping
    [{ stepSize: 5, stepSnapping: true }, 7, 7],
  ])('with %o stores the entered %o as %o', async (props, entered, stored) => {
    const { wrapper, data } = mountNumber(props);
    const input = wrapper.find('input');

    await input.setValue(String(entered));
    await input.trigger('blur');
    await flushPromises();

    expect(data.value.value).toBe(stored);
  });

  it.each([
    [{ stepSize: 5 }, 12],
    [{ stepSize: 5, stepSnapping: true }, 10],
  ])('with %o increases 7 to %o', async (props, increased) => {
    const { wrapper, data } = mountNumber(props);
    const input = wrapper.find('input');
    await input.setValue('7');
    await input.trigger('blur');

    const increase = wrapper.find('[data-slot="increment"] button');
    await increase.trigger('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0 });
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'mouse' }));
    await flushPromises();

    expect(data.value.value).toBe(increased);
  });
});
