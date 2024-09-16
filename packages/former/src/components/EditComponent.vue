<template>
  <div
    class="handle cursor-pointer"
    @click.stop="selectedNode = node"
    draggable="true"
    @dragstart.stop="startDrag($event, node._id)"
  >
    <div
      class="element flex items-center border-2 duration-0 w-full py-2 px-2 rounded"
      :class="{
        'border-blue-600': selectedNode?._id === node._id,
        'border-transparent': selectedNode?._id !== node._id,
      }"
    >
      <span class="drag-handle cursor-move p-2">::</span>
      <FormComponent :node :node-path v-model="modelValue" @valid="$emit('valid', $event)">
        <slot />
      </FormComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { InternalSchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';
import { inject } from '~/compositions/injectProvide';

defineProps<{
  node: InternalSchemaNode;
  nodePath?: string[];
}>();

defineEmits<{
  (e: 'valid', valid: boolean): void
}>();

const modelValue = defineModel();

const selectedNode = inject('selectedNode');

function startDrag(e: DragEvent, nodeId: string) {
  if (e.dataTransfer === null) {
    return;
  }

  e.dataTransfer.dropEffect = 'move';
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('node_id', nodeId);
}
</script>

<style>
.handle:hover:not(:has(.handle:hover)) > .element {
  @apply bg-zinc-100;
}
</style>
