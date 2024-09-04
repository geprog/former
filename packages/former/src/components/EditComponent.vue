<template>
  <div class="handle cursor-pointer" @click.stop="selectedNode = node">
    <div
      class="element flex items-center border-2 duration-0 w-full py-2 px-2 rounded"
      :class="{
        'border-blue-600': selectedNode?._id === node._id,
        'border-transparent': selectedNode?._id !== node._id,
      }"
    >
      <span class="drag-handle cursor-move p-2">::</span>
      <div>
        <FormComponent :node v-model="modelValue">
          <slot />
        </FormComponent>
      </div>
    </div>
    <!-- <div v-if="selectedNode === node" class="items-center btn-add flex gap-2 duration-1000 transition-all relative">
      <button @click.prevent="addNode" class="m-auto py-1 px-2 rounded">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="text-blue-600">
          <path
            fill="currentColor"
            d="M11 17h2v-4h4v-2h-4V7h-2v4H7v2h4zm-6 4q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zM5 5v14z"
          />
        </svg>
      </button>
    </div> -->
    <!-- <div class="former-dropzone p-4">
      <span class="">Drop here</span>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import type { InternalSchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';
import { inject } from '~/compositions/injectProvide';

defineProps<{
  node: InternalSchemaNode;
}>();

const modelValue = defineModel();

const selectedNode = inject('selectedNode');
</script>

<style>
.handle:hover:not(:has(.handle:hover)) > .element {
  @apply bg-slate-50;
}

.handle:hover:not(:has(.handle:hover)) > .btn-add {
  /* @apply opacity-100; */
}
</style>
