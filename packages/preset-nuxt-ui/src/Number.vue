<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <UInputNumber
      v-model:model-value="modelValue"
      :placeholder
      :min
      :max
      :step="stepSize"
      :step-snapping="!!stepSnapping"
      allow-invalid
      :format-options="formatOptions"
      size="lg"
      :disabled="mode === 'read'"
      class="w-full"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { usePresetValue } from '@former-ui/former';
import { computed, toRef } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    placeholder?: string;
    preset?: number;
    min?: number;
    max?: number;
    stepSize?: number;
    stepSnapping?: boolean;
    decimals?: number | null;
  } & FormerProps
>();

// formatting and parsing follow the locale of the surrounding UApp, values outside of `min` and `max` are kept
// as they are typed (instead of being clamped), so the validation can show an error for them
const modelValue = defineModel<number | null | undefined>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);

// numbers are rounded to the decimal places when they are entered, so the stored values have them as well
const formatOptions = computed<Intl.NumberFormatOptions | undefined>(() =>
  (typeof props.decimals === 'number' ? { maximumFractionDigits: props.decimals } : undefined));
</script>
