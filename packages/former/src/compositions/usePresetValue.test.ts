import type { Mode } from '~/types';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, provide, ref, type Ref } from 'vue';
import { usePresetValue } from './usePresetValue';

function mountUsePresetValue(options: {
  modelValue: Ref<string | null | undefined>;
  preset: Ref<string | null | undefined>;
  hasDataKey?: Ref<boolean>;
  mode?: Ref<Mode>;
}) {
  const Field = defineComponent({
    setup() {
      usePresetValue(options.modelValue, options.preset);
      return () => null;
    },
  });

  const Harness = defineComponent({
    setup() {
      if (options.hasDataKey) {
        provide('hasDataKey', options.hasDataKey);
      }
      if (options.mode) {
        provide('mode', options.mode);
      }
      return () => h(Field);
    },
  });

  return mount(Harness);
}

describe('usePresetValue', () => {
  it('applies the preset on mount if the key does not exist in the data', () => {
    const modelValue = ref<string | null | undefined>(undefined);
    mountUsePresetValue({ modelValue, preset: ref('preset'), hasDataKey: ref(false) });

    expect(modelValue.value).toBe('preset');
  });

  it.each([undefined, null, ''])('does not apply the preset if the key exists with value %j', (value) => {
    const modelValue = ref<string | null | undefined>(value);
    mountUsePresetValue({ modelValue, preset: ref('preset'), hasDataKey: ref(true) });

    expect(modelValue.value).toBe(value);
  });

  it('applies a changed preset only while the key does not exist', async () => {
    const modelValue = ref<string | null | undefined>(undefined);
    const preset = ref<string | undefined>(undefined);
    const hasDataKey = ref(false);
    mountUsePresetValue({ modelValue, preset, hasDataKey });

    preset.value = 'first';
    await nextTick();
    expect(modelValue.value).toBe('first');

    hasDataKey.value = true;
    modelValue.value = undefined;
    preset.value = 'second';
    await nextTick();
    expect(modelValue.value).toBeUndefined();
  });

  it('ignores a null preset', () => {
    const modelValue = ref<string | null | undefined>(undefined);
    mountUsePresetValue({ modelValue, preset: ref(null), hasDataKey: ref(false) });

    expect(modelValue.value).toBeUndefined();
  });

  it('does not apply the preset in read mode', () => {
    const modelValue = ref<string | null | undefined>(undefined);
    mountUsePresetValue({ modelValue, preset: ref('preset'), hasDataKey: ref(false), mode: ref('read') });

    expect(modelValue.value).toBeUndefined();
  });

  it('applies the preset when switching from read to edit mode while the key does not exist', async () => {
    const modelValue = ref<string | null | undefined>(undefined);
    const mode = ref<Mode>('read');
    mountUsePresetValue({ modelValue, preset: ref('preset'), hasDataKey: ref(false), mode });

    mode.value = 'edit';
    await nextTick();
    expect(modelValue.value).toBe('preset');
  });

  it('falls back to checking for an undefined model value outside of a form node', () => {
    const unset = ref<string | null | undefined>(undefined);
    mountUsePresetValue({ modelValue: unset, preset: ref('preset') });
    expect(unset.value).toBe('preset');

    const set = ref<string | null | undefined>(null);
    mountUsePresetValue({ modelValue: set, preset: ref('preset') });
    expect(set.value).toBeNull();
  });
});
