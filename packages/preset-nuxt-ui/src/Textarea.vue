<template>
  <UFormField
    v-if="!(mode === 'read' && !$attrs.modelValue)"
    :label
    :required
    :description="help"
    :error
    class="w-full"
  >
    <UTextarea v-bind="$attrs" size="lg" :disabled="mode === 'read'" />
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
  } & FormerProps
>();
</script>
