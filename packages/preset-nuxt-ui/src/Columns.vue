<template>
  <UFormField
    v-if="!(mode === 'read' && (!modelValue || Object.keys(modelValue).length === 0))"
    :label
    :description="help"
    class="flex w-full flex-col"
  >
    <div
      class="flex w-full gap-2 dark:border-gray-800 dark:bg-gray-900"
      :class="{ 'rounded-lg border border-[#e5e7eb] bg-white p-2 shadow-sm': border }"
    >
      <div v-for="column in columns" :key="column" class="w-full flex-grow">
        <FormRenderer :category="column" />
      </div>
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import type { FormData, FormerProps } from '@former-ui/former';
import { FormRenderer } from '@former-ui/former';
import { computed } from 'vue';

const props = defineProps<
  {
    label?: string;
    help?: string;
    cols?: number | '';
    border?: boolean;
  } & FormerProps
>();

const modelValue = defineModel<FormData | undefined>();
const columns = computed(() =>
  typeof props.cols !== 'number' || props.cols < 0
    ? []
    : [...Array.from({ length: props.cols })].map(column => `column-${column}`),
);
</script>
