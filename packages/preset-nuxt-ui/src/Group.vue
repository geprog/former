<template>
  <UFormField
    v-if="!(mode === 'read' && (!modelValue || Object.keys(modelValue).length === 0))"
    :label
    :error
    :description="help"
    class="flex w-full flex-col"
    :class="{ 'gap-1 pt-3': $props.label }"
  >
    <UCard class="w-full">
      <FormRenderer />
    </UCard>
  </UFormField>
</template>

<script setup lang="ts">
import { FormRenderer, type FormData, type FormerProps } from '@former-ui/former';

defineProps<
  {
    label?: string;
    help?: string;
  } & FormerProps
>();
const modelValue = defineModel<FormData | undefined>();
</script>
