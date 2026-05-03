import type { FormData } from '~/types';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, provide, ref, type Ref, unref } from 'vue';
import { inject } from '~/compositions/injectProvide';

import FormDataProvider from './FormDataProvider.vue';

const OUTER_ID = 'outer-fdp-id';
const INNER_ID = 'inner-fdp-id';

const { nanoidMock } = vi.hoisted(() => ({
  nanoidMock: vi.fn(),
}));

vi.mock('~/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/utils')>();
  return { ...actual, nanoid: nanoidMock };
});

const DataInjectProbe = defineComponent({
  name: 'DataInjectProbe',
  setup() {
    const data = inject('data');
    return () =>
      h('span', {
        'data-inject-data': JSON.stringify(unref(data)),
      });
  },
});

const ValidityChildSetter = defineComponent({
  name: 'ValidityChildSetter',
  setup() {
    const map = inject('validityMap') as Ref<Record<string, boolean | undefined>>;
    const setInvalid = () => {
      map.value = { ...map.value, childKey: false };
    };
    const clearInvalid = () => {
      const { childKey: _c, ...rest } = map.value;
      map.value = { ...rest };
    };
    return () =>
      h('div', [
        h('button', { 'type': 'button', 'data-set-invalid': '', 'onClick': setInvalid }),
        h('button', { 'type': 'button', 'data-set-clear-invalid': '', 'onClick': clearInvalid }),
      ]);
  },
});

const mountedWrappers: Array<ReturnType<typeof mount>> = [];

function mountFormDataProvider(options?: {
  formData?: Ref<FormData>;
  defaultSlot?: () => ReturnType<typeof h>;
}) {
  const rootValidityMap = ref<Record<string, boolean | undefined>>({});
  const formData = options?.formData ?? ref<FormData>({ item: 1 });
  const slot = options?.defaultSlot;

  const Parent = defineComponent({
    setup() {
      provide('validityMap', rootValidityMap);
      return () =>
        h(FormDataProvider, { data: formData.value }, {
          default: slot ?? (() => h(DataInjectProbe)),
        });
    },
  });

  const wrapper = mount(Parent, { attachTo: document.body });
  mountedWrappers.push(wrapper);
  return { wrapper, rootValidityMap, formData };
}

function detachWrapper(wrapper: ReturnType<typeof mount>) {
  const i = mountedWrappers.indexOf(wrapper);
  if (i !== -1) {
    mountedWrappers.splice(i, 1);
  }
}

describe('component FormDataProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nanoidMock.mockReset();
    nanoidMock.mockReturnValue(OUTER_ID);
  });

  afterEach(() => {
    for (const w of mountedWrappers.splice(0)) {
      w.unmount();
    }
  });

  it('throws when validityMap is not provided by an ancestor', () => {
    expect(() =>
      mount(FormDataProvider, {
        props: { data: {} },
        attachTo: document.body,
      }),
    ).toThrow('Please provide a value for validityMap');
  });

  it('provides reactive data from the data prop to descendants', async () => {
    const formData = ref<FormData>({ a: 1 });
    const { wrapper } = mountFormDataProvider({ formData });
    expect(wrapper.find('[data-inject-data]').attributes('data-inject-data')).toBe(JSON.stringify({ a: 1 }));
    formData.value = { a: 2, b: 'x' };
    await nextTick();
    expect(wrapper.find('[data-inject-data]').attributes('data-inject-data')).toBe(JSON.stringify({ a: 2, b: 'x' }));
  });

  it('slot injects an own validityMap ref instead of using the root', () => {
    let slotInjected: Ref<Record<string, boolean | undefined>> | undefined;
    const MapRefProbe = defineComponent({
      setup() {
        slotInjected = inject('validityMap') as Ref<Record<string, boolean | undefined>>;
        return () => h('span', { 'data-map-probe': '1' });
      },
    });
    const { wrapper, rootValidityMap } = mountFormDataProvider({
      defaultSlot: () => h(MapRefProbe),
    });
    expect(wrapper.find('[data-map-probe]').exists()).toBe(true);
    expect(slotInjected).toBeDefined();
    expect(slotInjected).not.toBe(rootValidityMap);
  });

  it('writes aggregated validity to the root map on mount and when children map changes', async () => {
    const { wrapper, rootValidityMap } = mountFormDataProvider({
      defaultSlot: () => h(ValidityChildSetter),
    });
    expect(rootValidityMap.value[OUTER_ID]).toBe(true);
    await wrapper.find('[data-set-invalid]').trigger('click');
    await nextTick();
    expect(rootValidityMap.value[OUTER_ID]).toBe(false);
    await wrapper.find('[data-set-clear-invalid]').trigger('click');
    await nextTick();
    expect(rootValidityMap.value[OUTER_ID]).toBe(true);
  });

  it('removes its id from the root validityMap on unmount', () => {
    const { wrapper, rootValidityMap } = mountFormDataProvider({
      defaultSlot: () => h(ValidityChildSetter),
    });
    expect(rootValidityMap.value[OUTER_ID]).toBe(true);
    detachWrapper(wrapper);
    wrapper.unmount();
    expect(rootValidityMap.value[OUTER_ID]).toBeUndefined();
  });

  describe('nested FormDataProvider', () => {
    beforeEach(() => {
      nanoidMock.mockReset();
      nanoidMock.mockReturnValueOnce(OUTER_ID).mockReturnValueOnce(INNER_ID);
    });

    it('chains inject/provide and propagates inner invalidity to the root map', async () => {
      let capturedOuterChildrenMap: Ref<Record<string, boolean | undefined>> | undefined;
      let innerScopedMap: Ref<Record<string, boolean | undefined>> | undefined;

      const CaptureOuterChildrenMap = defineComponent({
        name: 'CaptureOuterChildrenMap',
        setup(_, { slots }) {
          capturedOuterChildrenMap = inject('validityMap') as Ref<Record<string, boolean | undefined>>;
          return () => h('div', { 'data-capture-outer-children': '1' }, slots.default?.());
        },
      });

      const InnerValidityProbe = defineComponent({
        name: 'InnerValidityProbe',
        setup() {
          const innerMap = inject('validityMap') as Ref<Record<string, boolean | undefined>>;
          innerScopedMap = innerMap;
          return () =>
            h('button', {
              'type': 'button',
              'data-inner-invalidate': '',
              'onClick': () => {
                innerMap.value = { ...innerMap.value, deep: false };
              },
            });
        },
      });

      const rootValidityMap = ref<Record<string, boolean | undefined>>({});
      const outerData = ref<FormData>({ outer: 1 });
      const innerData = ref<FormData>({ inner: 1 });

      const Parent = defineComponent({
        setup() {
          provide('validityMap', rootValidityMap);
          return () =>
            h(FormDataProvider, { data: outerData.value }, {
              default: () =>
                h(CaptureOuterChildrenMap, {}, {
                  default: () =>
                    h(FormDataProvider, { data: innerData.value }, {
                      default: () => h(InnerValidityProbe),
                    }),
                }),
            });
        },
      });

      const wrapper = mount(Parent, { attachTo: document.body });
      mountedWrappers.push(wrapper);

      expect(capturedOuterChildrenMap).toBeDefined();
      expect(innerScopedMap).toBeDefined();
      expect(capturedOuterChildrenMap).not.toBe(rootValidityMap);
      expect(innerScopedMap).not.toBe(rootValidityMap);
      expect(innerScopedMap).not.toBe(capturedOuterChildrenMap);

      expect(rootValidityMap.value[OUTER_ID]).toBe(true);
      expect(rootValidityMap.value[INNER_ID]).toBeUndefined();
      expect(capturedOuterChildrenMap!.value[INNER_ID]).toBe(true);

      await wrapper.find('[data-inner-invalidate]').trigger('click');
      await nextTick();
      expect(capturedOuterChildrenMap!.value[INNER_ID]).toBe(false);
      expect(rootValidityMap.value[OUTER_ID]).toBe(false);
      expect(rootValidityMap.value[INNER_ID]).toBeUndefined();

      detachWrapper(wrapper);
      wrapper.unmount();
      expect(rootValidityMap.value[OUTER_ID]).toBeUndefined();
      expect(capturedOuterChildrenMap!.value[INNER_ID]).toBeUndefined();
    });
  });
});
