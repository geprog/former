<template>
  <div class="w-full">
    <UFormGroup v-if="label" :label="label" :help="help" />
    <div class="text-sm opacity-60">
      Repeater (Nuxt UI preset) – TODO
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';

defineOptions({ inheritAttrs: false });
defineProps<{ label?: string; help?: string; itemLabel?: string } & Partial<FormerProps>>();
</script>
