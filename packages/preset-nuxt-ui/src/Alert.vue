<template>
  <UAlert
    :title="label || undefined"
    :description="text || undefined"
    :color="color || 'info'"
    :icon="icons[color || 'info']"
    variant="subtle"
    class="w-full"
  />
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';

defineOptions({ inheritAttrs: false });

defineProps<
  {
    label?: string;
    text?: string;
    color?: AlertColor | null;
  } & FormerProps
>();

type AlertColor = 'info' | 'success' | 'warning' | 'error' | 'neutral';

const icons: Record<AlertColor, string | undefined> = {
  info: 'i-heroicons-information-circle',
  success: 'i-heroicons-check-circle',
  warning: 'i-heroicons-exclamation-triangle',
  error: 'i-heroicons-x-circle',
  neutral: undefined,
};
</script>
