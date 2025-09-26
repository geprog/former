<template>
  <UFormGroup
    :label="label"
    :help="help"
    :error="error"
    class="w-full"
  >
    <UCard v-if="border" :ui="{ body: { padding: 'p-4 sm:p-6' } }">
      <slot />
    </UCard>

    <div v-else>
      <slot />
    </div>
  </UFormGroup>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';

const props = withDefaults(defineProps<{
  label?: string
  help?: string
  border?: boolean
} & Partial<FormerProps>>(), {
  border: false,
});

const { label, help, error, border } = props;
</script>
