<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <USelectMenu
      v-model:model-value="selected"
      :placeholder
      :items
      value-key="value"
      :multiple="!!multiple"
      :search-input="!!search"
      :clear="!required"
      size="lg"
      :disabled="mode === 'read'"
      class="w-full"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import type { Option } from './composables/useOptions';
import { usePresetValue } from '@former-ui/former';
import { computed } from 'vue';
import { toChosen, toItems } from './composables/useOptions';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    placeholder?: string;
    options?: Option[];
    multiple?: boolean;
    search?: boolean;
  } & FormerProps
>();

// a single value is stored as string, several values as list of strings
const modelValue = defineModel<string | string[] | null>();

const items = computed(() => toItems(props.options));

// several options marked as preset are all chosen with multiple choice, otherwise the first one is
usePresetValue(modelValue, () => {
  const presets = props.options?.filter(option => option.preset).map(option => option.value) ?? [];
  if (props.multiple) {
    return presets.length ? presets : undefined;
  }
  return presets[0];
});

// choosing no option clears the value
const selected = computed({
  get: () => {
    const chosen = toChosen(modelValue.value, props.multiple) as string | string[] | null | undefined;
    return chosen ?? (props.multiple
      ? []
      : undefined);
  },
  set: (value: string | string[] | null | undefined) =>
    (modelValue.value = Array.isArray(value)
      ? (value.length ? value : null)
      : (value ?? null)),
});
</script>
