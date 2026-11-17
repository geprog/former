import type { Ref } from 'vue';
import { usePresetValue } from '@former-ui/former';
import { computed } from 'vue';

export type Option = { label?: string; value: string; preset?: boolean };

export function toItems<T extends Option>(options: T[] | undefined) {
  return options?.map(option => ({ ...option, label: option.label || option.value })) ?? [];
}

// the chosen value of a field which may allow several choices (e.g. a select): a single value is a list with it
// and a list is its first value, so data stored before `multiple` was toggled is still shown and validated
export function toChosen(value: unknown, multiple: boolean | undefined) {
  if (multiple) {
    return typeof value === 'string'
      ? [value]
      : value;
  }
  return Array.isArray(value)
    ? (value[0] ?? null)
    : value;
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
