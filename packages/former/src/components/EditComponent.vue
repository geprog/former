<template>
  <div class="handle cursor-pointer" @click.stop="selectedNode = node">
    <div class="element transition-colors border-2 border-transparent duration-7600 w-full p-2 rounded">
      <FormComponent :node v-model="modelValue">
        <slot />
      </FormComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { InternalSchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';
import { inject } from '~/compositions/injectProvide';
import { toRef } from 'vue';

defineProps<{
  node: InternalSchemaNode;
}>();

const modelValue = defineModel();

const selectedNode = inject('selectedNode');
</script>

<style>
.handle:hover:not(:has(.handle:hover)) > .element {
  @apply border-blue-600;
}

.handle:hover:not(:has(.handle:hover)) > .btn-add {
  @apply opacity-100;
}
</style>
