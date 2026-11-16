<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <USlider
      v-model:model-value="sliderValue"
      :min="min ?? DEFAULT_MIN"
      :max="max ?? DEFAULT_MAX"
      :step="stepSize || 1"
      tooltip
      size="lg"
      :disabled="mode === 'read'"
      class="w-full py-2"
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
    preset?: number;
    min?: number | null;
    max?: number | null;
    stepSize?: number | null;
  } & FormerProps
>();

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;

const modelValue = defineModel<number | null | undefined>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);

// the slider can't show an empty value, so it is shown at the minimum until a value is chosen
const sliderValue = computed({
  get: () => modelValue.value ?? props.min ?? DEFAULT_MIN,
  set: (value: number | undefined) => (modelValue.value = value ?? null),
});
</script>
