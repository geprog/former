import type { FormComponents, FormData, SchemaNode } from '@former-ui/former';
import { Former } from '@former-ui/former';
import { Time } from '@internationalized/date';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { createFormComponents } from './formComponents';

const components: FormComponents = { time: createFormComponents(key => key).time };

function mountTime(initialData: FormData, props: SchemaNode['props'] = {}) {
  const data = ref<FormData>(initialData);
  const wrapper = mount(Former, {
    props: {
      'schema': [{ type: 'time', name: 'start', props }],
      'data': data.value,
      'onUpdate:data': (value: FormData) => (data.value = value),
      components,
      'mode': 'edit',
    },
    global: { components: nuxtUiStubs },
  });
  return { wrapper, data };
}

describe('time', () => {
  it('stores the entered time with minutes', async () => {
    const { wrapper, data } = mountTime({});

    wrapper.findComponent({ name: 'UInputTime' }).vm.$emit('update:modelValue', new Time(9, 5));
    await nextTick();

    expect(data.value.start).toBe('09:05');
  });

  it('clears the value when the time is removed', async () => {
    const { wrapper, data } = mountTime({ start: '09:05' });

    wrapper.findComponent({ name: 'UInputTime' }).vm.$emit('update:modelValue', undefined);
    await nextTick();

    expect(data.value.start).toBeNull();
  });

  it('applies the preset', async () => {
    const { data } = mountTime({}, { preset: '08:30' });
    await nextTick();

    expect(data.value.start).toBe('08:30');
  });
});
