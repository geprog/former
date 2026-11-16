import { usePresetValue } from '@former-ui/former';
import { computed, type Ref } from 'vue';

export type Option = { label?: string; value: string; preset?: boolean };

function toItems<T extends Option>(options: T[] | undefined) {
  return options?.map(option => ({ ...option, label: option.label || option.value })) ?? [];
}

export function useOptions<T extends Option>(modelValue: Ref<string | null | undefined>, options: Ref<T[] | undefined>) {
  const items = computed(() => toItems(options.value));

  usePresetValue(modelValue, () => options.value?.find(option => option.preset)?.value);

  return { items };
}

// options of which several can be chosen, all options marked as preset are chosen by default
export function useMultipleOptions<T extends Option>(modelValue: Ref<string[] | null | undefined>, options: Ref<T[] | undefined>) {
  const items = computed(() => toItems(options.value));

  usePresetValue(modelValue, () => {
    const presets = options.value?.filter(option => option.preset).map(option => option.value) ?? [];
    return presets.length ? presets : undefined;
  });

  // choosing no option clears the value, like an unchecked checkbox
  const selected = computed({
    get: () => modelValue.value ?? [],
    set: (value: string[]) => (modelValue.value = value.length ? value : null),
  });

  return { items, selected };
}
