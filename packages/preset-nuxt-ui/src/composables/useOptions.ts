import { usePresetValue } from '@former-ui/former';
import { computed, type Ref } from 'vue';

export type Option = { label?: string; value: string; preset?: boolean };

export function useOptions<T extends Option>(modelValue: Ref<string | null | undefined>, options: Ref<T[] | undefined>) {
  const items = computed(() => options.value?.map(option => ({ ...option, label: option.label || option.value })) ?? []);

  usePresetValue(modelValue, () => options.value?.find(option => option.preset)?.value);

  return { items };
}
