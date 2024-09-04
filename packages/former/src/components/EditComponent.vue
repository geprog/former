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
  @apply bg-zinc-100;
}
</style>
