<template>
  <div class="relative" :class="{ 'former-drag-container': mode === 'build' }" :data-parent-node="node?._id">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import type { InternalSchemaNode } from '~/types';

defineProps<{ node?: InternalSchemaNode }>();

const mode = inject('mode');
</script>
