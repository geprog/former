import { usePresetValue } from '@former-ui/former';
import { computed, type Ref } from 'vue';

export type Option = { label?: string; value: string; preset?: boolean };

type Config = {
  fallbackValueForLabel?: boolean;
};

export function useOptions<T extends Option>(
  modelValue: Ref<string | undefined>,
  options: Ref<T[] | undefined>,
  config?: Partial<Config>,
) {
  const fallbackValueForLabel = config?.fallbackValueForLabel ?? true;

  const presetOption = computed(() => {
    return (options.value || []).find(option =>
      option.preset ?? false,
    );
  });

  const items = computed(() => {
    if (!fallbackValueForLabel) {
      return options.value ?? [];
    }
    return options.value?.map(option => ({ ...option, label: option.label ?? option.value })) ?? [];
  });

  usePresetValue(modelValue, () => presetOption.value?.value);

  return {
    items,
    presetOption,
  };
}
