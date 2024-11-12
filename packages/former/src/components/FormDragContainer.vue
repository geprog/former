<template>
  <div class="relative flex flex-col gap-3" :class="{ 'former-drag-container min-h-24 w-full': mode === 'build' }" :data-parent-node="node?._id" :data-category="category">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import type { InternalSchemaNode } from '~/types';

defineProps<{ node?: InternalSchemaNode; category?: string }>();

const mode = inject('mode');
</script>
