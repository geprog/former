<template>
  <USeparator :label="label || undefined" :type="type || undefined" class="py-2" />
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';

defineOptions({ inheritAttrs: false });

defineProps<
  {
    label?: string;
    type?: 'solid' | 'dashed' | 'dotted' | null;
  } & FormerProps
>();
</script>
