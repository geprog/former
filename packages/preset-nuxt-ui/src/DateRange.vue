<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <UInputDate
      :model-value="rangeValue"
      range
      :min-value="minValue"
      :max-value="maxValue"
      size="lg"
      :disabled="mode === 'read'"
      class="w-full"
      @update:model-value="modelValue = toIsoRange($event)"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import type { CalendarDate, DateValue } from '@internationalized/date';
import type { DateRange } from './dateRange';
import { parseDate } from '@internationalized/date';
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    min?: string;
    max?: string;
  } & FormerProps
>();

// the range is stored as ISO strings (`{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }`), a missing date is `null`
// and a range without dates is cleared, formatting follows the locale of the surrounding UApp
const modelValue = defineModel<DateRange | null | undefined>();

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

function toIsoRange(value: { start?: DateValue; end?: DateValue } | null | undefined): DateRange | null {
  const start = value?.start?.toString().slice(0, 10) ?? null;
  const end = value?.end?.toString().slice(0, 10) ?? null;
  return start || end
    ? { start, end }
    : null;
}

const rangeValue = computed(() => {
  const range = modelValue.value;
  return range
    ? {
        start: toCalendarDate(range.start),
        end: toCalendarDate(range.end),
      }
    : undefined;
});
const minValue = computed(() => toCalendarDate(props.min));
const maxValue = computed(() => toCalendarDate(props.max));
</script>
