<template>
  <UFormField v-if="!(mode === 'read' && (modelValue === undefined || modelValue === null))" :label :required :description="help" :error class="w-full">
    <UInputNumber
      v-bind="$attrs"
      :model-value="modelValue"
      :min
      :max
      :step="stepSize"
      :step-snapping="false"
      size="lg"
      :disabled="mode === 'read'"
      class="w-full"
      @update:model-value="modelValue = $event ?? null"
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
    preset?: number;
    min?: number;
    max?: number;
    stepSize?: number;
  } & FormerProps
>();

// formatting and parsing follow the locale of the surrounding UApp
// a cleared field is `null` (not `undefined`) so the key survives JSON serialization
// and the preset isn't re-applied after the data was saved and loaded again
const modelValue = defineModel<number | null | undefined>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);
</script>
