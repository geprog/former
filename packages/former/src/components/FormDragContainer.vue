<template>
  <div
    class="relative flex flex-col gap-4 text-left before:content-[attr(data-drag-hint)] before:hidden before:m-auto before:text-center"
    :class="{
      'former-drag-container min-h-24 w-full border-2 dark:border-zinc-400 border-dashed rounded-md border-zinc-200 empty:before:block empty:bg-zinc-100 empty:dark:bg-zinc-700': mode === 'build',
    }"
    :data-parent-node="node?._id"
    :data-category="category"
    :data-drag-hint="texts.dragHint"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { inject } from '~/compositions/injectProvide';

defineProps<{ category?: string }>();

const node = inject('node', false);
const mode = inject('mode');
const texts = inject('texts');
</script>
