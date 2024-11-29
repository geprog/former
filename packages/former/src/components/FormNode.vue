<template>
  <div
    v-if="isShown || mode === 'build'"
    :data-node="node._id"
    :draggable="mode === 'build'"
    class="relative flex items-center border-2 border-transparent duration-0 w-full py-2 px-2 rounded"
    :class="{
      '!border-blue-600': mode === 'build' && selectedNode?._id === node._id,
      'bg-zinc-300 rounded': mode === 'build' && !isShown,
      'former-draggable ': mode === 'build',
    }"
    @click.stop="selectedNode = node"
    @dragstart.stop="startDrag($event, node._id)"
  >
    <span v-if="mode === 'build'" class="drag-handle !cursor-move p-2">::</span>
    <component :is="component" v-if="component" v-bind="node.props" :id="node._id" v-model="modelValue" :mode :error>
      <slot />
    </component>
    <span v-else>Component type not found!</span>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import { inject, provide } from '~/compositions/injectProvide';
import useNode from '~/compositions/useNode';
import type { InternalSchemaNode } from '~/types';
import { setDragEventData } from '~/utils';

const props = defineProps<{
  node: InternalSchemaNode;
  repeatedFormIdentifier?: string | number;
}>();

const node = toRef(props, 'node');
const repeatedFormIdentifier = toRef(props, 'repeatedFormIdentifier');
const { component, error, isShown, modelValue } = useNode(node, repeatedFormIdentifier);

const mode = inject('mode');
const selectedNode = inject('selectedNode');
const formId = inject('formId');

provide('node', node);

function startDrag(e: DragEvent, nodeId: string) {
  setDragEventData(e, formId.value, 'node_id', nodeId);
}
</script>

<style>
/** necessary to do proper hovering in nested elements */
.former-draggable[data-node]:hover:not(:has([data-node]:hover)) {
  @apply bg-blue-200;
}

.former-draggable[data-node] *:not(input) {
  @apply cursor-pointer;
}
</style>
