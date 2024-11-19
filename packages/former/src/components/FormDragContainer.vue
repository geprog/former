<template>
  <div class="relative flex flex-col gap-3 before:content-['Here_you_can_drag_elements'] before:hidden before:m-auto before:text-center" :class="{ 'former-drag-container min-h-24 w-full border-2 border-dashed rounded-md border-zinc-200 empty:before:block empty:bg-zinc-100': mode === 'build' }" :data-parent-node="node?._id" :data-category="category">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import type { InternalSchemaNode } from '~/types';

defineProps<{ node?: InternalSchemaNode; category?: string }>();

const mode = inject('mode');
</script>
