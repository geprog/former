<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <UInputNumber
      v-model:model-value="modelValue"
      :placeholder
      :min
      :max
      :step="stepSize"
      :step-snapping="false"
      size="lg"
      :disabled="mode === 'read'"
      class="w-full"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { usePresetValue } from '@former-ui/former';
import { toRef } from 'vue';

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
  } & FormerProps
>();

// formatting and parsing follow the locale of the surrounding UApp
const modelValue = defineModel<number | null | undefined>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);
</script>
