<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label
    :required
    :description="help"
    :error
    class="w-full"
  >
    <UTextarea v-model:model-value="modelValue" :placeholder :rows size="lg" :disabled="mode === 'read'" />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';

defineOptions({ inheritAttrs: false });

defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    placeholder?: string;
    rows?: number;
  } & FormerProps
>();

const modelValue = defineModel<string | null>();
</script>
