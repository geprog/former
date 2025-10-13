<template>
  <div class="w-full">
    <UFormField v-if="label" :label="label" :help="help" />
    <div class="grid gap-4" :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { toRefs } from 'vue';

const props = withDefaults(
  defineProps<{
    label?: string
    help?: string
    cols?: number
  } & Partial<FormerProps>>(),
  { cols: 2 },
);

const { label, help, cols } = toRefs(props);
</script>
