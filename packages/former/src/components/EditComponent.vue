<template>
  <div class="flex flex-col gap-4">
    <div class="handle cursor-pointer" @click.stop="selectedNode = node">
      <div
        class="element transition-colors border-2 border-transparent duration-0 w-full p-4 rounded"
        :class="{
          'border-blue-600': selectedNode === node,
        }"
      >
        <FormComponent :node v-model="modelValue">
          <slot />
        </FormComponent>
      </div>
      <div class="items-center btn-add opacity-0 flex gap-2 duration-1000 transition-all relative">
        <div class="flex-grow h-0.5 rounded-sm bg-blue-300" />
        <button @click.prevent="selectedNode = undefined" class="m-auto py-1 px-2 rounded">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="text-blue-600">
            <path
              fill="currentColor"
              d="M11 17h2v-4h4v-2h-4V7h-2v4H7v2h4zm-6 4q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zM5 5v14z"
            />
          </svg>
        </button>
        <div class="flex-grow h-0.5 rounded-sm bg-blue-300" />
      </div>
    </div>
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
  @apply border-blue-300 bg-slate-100;
}

.handle:hover:not(:has(.handle:hover)) > .btn-add {
  @apply opacity-100;
}
</style>
