<template>
  <div class="flex flex-col gap-2">
    <div class="handle cursor-pointer" @click.stop="selectedNode = node">
      <div
        class="element transition-colors border-2 border-transparent duration-7600 w-full p-2 rounded"
        :class="{
          'border-blue-600': selectedNode === node,
        }"
      >
        <FormComponent :node v-model="modelValue">
          <slot />
        </FormComponent>
      </div>
    </div>
    <button @click.prevent="selectedNode = undefined" class="border bg-slate-100 hover:bg-slate-300 py-1 px-2 rounded">
      + Add
    </button>
  </div>
</template>

<script setup lang="ts">
import type { SchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';
import { inject } from '~/compositions/injectProvide';

defineProps<{
  node: SchemaNode;
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
