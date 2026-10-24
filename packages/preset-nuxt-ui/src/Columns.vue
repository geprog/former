<template>
  <UFormField
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
import { columnCategories, DEFAULT_COLUMN_COUNT } from './columns';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<
    {
      label?: string;
      help?: string;
      cols?: number | '';
      border?: boolean;
    } & FormerProps
  >(),
  { cols: DEFAULT_COLUMN_COUNT },
);

// columns are a layout component, so their model value is the data of the surrounding node
defineModel<FormData | null | undefined>();
const columns = computed(() => columnCategories(props.cols));
</script>
