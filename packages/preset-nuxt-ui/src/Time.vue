<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <UInputTime
      :model-value="timeValue"
      :min-value="minValue"
      :max-value="maxValue"
      size="lg"
      :disabled="mode === 'read'"
      class="w-full"
      @update:model-value="modelValue = toIsoTime($event)"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { usePresetValue } from '@former-ui/former';
import { parseTime, Time } from '@internationalized/date';
import { computed, toRef } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    preset?: string;
    min?: string;
    max?: string;
  } & FormerProps
>();

// times are stored as ISO strings with minutes (HH:mm), formatting follows the locale of the surrounding UApp
const modelValue = defineModel<string | null | undefined>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);

function toTime(value: string | null | undefined): Time | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return parseTime(value);
  }
  catch {
    return undefined;
  }
}

function toIsoTime(value: unknown): string | null {
  return value instanceof Time ? value.toString().slice(0, 5) : null;
}

const timeValue = computed(() => toTime(modelValue.value));
const minValue = computed(() => toTime(props.min));
const maxValue = computed(() => toTime(props.max));
</script>
