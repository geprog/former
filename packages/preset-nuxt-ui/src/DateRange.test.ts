import type { FormComponents, FormData } from '@former-ui/former';
import { Former } from '@former-ui/former';
import { CalendarDate } from '@internationalized/date';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { nuxtUiStubs } from '../test/nuxtUiStubs';
import { createFormComponents } from './formComponents';

const components: FormComponents = { date_range: createFormComponents(key => key).date_range };

function mountDateRange(initialData: FormData) {
  const data = ref<FormData>(initialData);
  const wrapper = mount(Former, {
    props: {
      'schema': [
        { type: 'date_range', name: 'stay' },
      ],
      'data': data.value,
      'onUpdate:data': (value: FormData) => (data.value = value),
      components,
      'mode': 'edit',
    },
    global: { components: nuxtUiStubs },
  });
  return { wrapper, data };
}

function emitRange(wrapper: ReturnType<typeof mountDateRange>['wrapper'], range: unknown) {
  wrapper.findComponent({ name: 'UInputDate' }).vm.$emit('update:modelValue', range);
}

describe('date range', () => {
  it('stores the dates as ISO strings', async () => {
    const { wrapper, data } = mountDateRange({});

    emitRange(wrapper, {
      start: new CalendarDate(2026, 3, 1),
      end: new CalendarDate(2026, 3, 5),
    });
    await nextTick();

    expect(data.value.stay).toStrictEqual({ start: '2026-03-01', end: '2026-03-05' });
  });

  it('stores a missing date as `null`', async () => {
    const { wrapper, data } = mountDateRange({});

    emitRange(wrapper, {
      start: new CalendarDate(2026, 3, 1),
      end: undefined,
    });
    await nextTick();

    expect(data.value.stay).toStrictEqual({ start: '2026-03-01', end: null });
  });

  it('clears the value when both dates are removed', async () => {
    const { wrapper, data } = mountDateRange({
      stay: { start: '2026-03-01', end: '2026-03-05' },
    });

    emitRange(wrapper, { start: undefined, end: undefined });
    await nextTick();

    expect(data.value.stay).toBeNull();
  });

  it('shows the stored dates', () => {
    const { wrapper } = mountDateRange({
      stay: { start: '2026-03-01', end: '2026-03-05' },
    });
    const range = wrapper.findComponent({ name: 'UInputDate' }).vm.$attrs['model-value'] as { start: CalendarDate; end: CalendarDate };

    expect(range.start.toString()).toBe('2026-03-01');
    expect(range.end.toString()).toBe('2026-03-05');
  });
});
