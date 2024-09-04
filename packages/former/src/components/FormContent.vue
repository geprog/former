<template>
  <div
    class="former-drag-container"
    :class="{
      'former-edit': edit,
    }"
  >
    <FormRenderer v-model:data="data" :edit :schema />
  </div>
</template>

<script setup lang="ts">
import { inject } from '~/compositions/injectProvide';
import FormRenderer from './FormRenderer.vue';

const edit = inject('edit');
const schema = inject('schema');
const data = inject('data');
</script>

<style>
/* some minimal box to allow users to be able to add elements to an empty group */
.former-edit .former-drag-container {
  @apply min-h-24 min-w-24 w-full;
}

.former-edit .former-draggable.draggable-mirror > span,
.former-edit .former-draggable.draggable-source--is-dragging > span {
  @apply hidden;
}

/* highlight the dropzone when dragging */
.draggable--is-dragging .former-edit .former-drag-container {
  @apply bg-zinc-100 rounded;
}
</style>
