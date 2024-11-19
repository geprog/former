<template>
  <div
    class="handle cursor-pointer"
    draggable="true"
    @click.stop="selectedNode = node"
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
      <FormComponent v-model="modelValue" :node @valid="$emit('valid', $event)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from '~/compositions/injectProvide';
import type { FieldData, FormData, InternalSchemaNode } from '~/types';
import { setDragEventData } from '~/utils';
import FormComponent from './FormComponent.vue';

defineProps<{
  node: InternalSchemaNode;
}>();

defineEmits<{
  (e: 'valid', valid: boolean): void;
}>();

const modelValue = defineModel<FieldData | FormData>();

const selectedNode = inject('selectedNode');
const formId = inject('formId');

function startDrag(e: DragEvent, nodeId: string) {
  setDragEventData(e, formId.value, 'node_id', nodeId);
}
</script>

<style>
/** necessary to do proper hovering in nested elements */
.handle:hover:not(:has(.handle:hover)) > .element {
  @apply bg-blue-200;
}
</style>
