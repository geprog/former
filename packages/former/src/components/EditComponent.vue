<template>
  <div class="handle cursor-pointer">
    <div class="element transition-colors border-2 border-transparent duration-7600 w-full p-4 rounded">
      <FormComponent :node v-model="modelValue">
        <slot />
      </FormComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';

defineProps<{
  node: SchemaNode;
}>();

const modelValue = defineModel();
</script>

<style>
.handle:hover:not(:has(.handle:hover)) > .element {
  @apply border-blue-600;
}

.handle:hover:not(:has(.handle:hover)) > .btn-add {
  @apply opacity-100;
}
</style>
