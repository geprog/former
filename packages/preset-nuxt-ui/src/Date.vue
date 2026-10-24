<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <UInputDate
      :model-value="dateValue"
      :min-value="minValue"
      :max-value="maxValue"
      size="lg"
      :disabled="mode === 'read'"
      class="w-full"
      @update:model-value="modelValue = $event?.toString()"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { usePresetValue } from '@former-ui/former';
import { type CalendarDate, parseDate } from '@internationalized/date';
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

// dates are stored as ISO strings (YYYY-MM-DD), formatting follows the locale of the surrounding UApp
const modelValue = defineModel<string | null | undefined>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);

function toCalendarDate(value: string | null | undefined): CalendarDate | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return parseDate(value);
  }
  catch {
    return undefined;
  }
}

const dateValue = computed(() => toCalendarDate(modelValue.value));
const minValue = computed(() => toCalendarDate(props.min));
const maxValue = computed(() => toCalendarDate(props.max));
</script>
