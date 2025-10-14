<template>
  <UFormField
    v-if="!(mode === 'read' && (!modelValue || Object.keys(modelValue).length === 0))"
    :label="label"
    :description="help"
    class="flex w-full flex-col"
  >
    <div
      class="flex w-full gap-2"
      :class="border ? 'rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-white p-2 shadow-sm' : ''"
    >
      <div v-for="column in columns" :key="column" class="w-full flex-grow">
        <FormRenderer :category="column" />
      </div>
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import { type FormData, type FormerProps, FormRenderer } from 'former-ui';
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  label?: string
  help?: string
  cols?: number
  border?: boolean
} & FormerProps>(), {
  cols: 2,
  border: false,
});

const modelValue = defineModel<FormData | undefined>();

const columns = computed(() => {
  const n = Number(props.cols ?? 2) || 2;
  if (n === 2)
    return ['left', 'right'];
  return Array.from({ length: n }, (_, i) => (i === 0 ? 'default' : `column-${i}`));
});
</script>
