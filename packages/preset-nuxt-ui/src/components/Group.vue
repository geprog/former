<template>
  <UFormField
    v-if="!(mode === 'read' && (!modelValue || Object.keys(modelValue).length === 0))"
    :label="label"
    :description="help"
    :error="error"
    class="flex w-full flex-col"
    :class="{ 'gap-1 pt-3': !!label }"
  >
    <div class="w-full rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-4">
      <FormRenderer />
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import { type FormData, type FormerProps, FormRenderer } from 'former-ui';
import { toRef } from 'vue';

const props = defineProps<{
  label?: string
  help?: string
} & FormerProps>();

const modelValue = defineModel<FormData | undefined>();
const mode = toRef(props, 'mode');
const { label, help, error } = props;
</script>
