<template>
  <div
    v-if="isShown || mode === 'build'"
    ref="elementRef"
    :data-node="node._id"
    :draggable="mode === 'build'"
    class="relative flex items-center duration-0 w-full rounded empty:hidden"
    :class="{
      'border-2 !border-blue-600': mode === 'build' && selectedNode?._id === node._id,
      'bg-zinc-300 dark:bg-zinc-700 rounded': mode === 'build' && !isShown,
      'former-draggable p-2': mode === 'build',
      'border-2 border-red-500': mode === 'build' && !isNodeValidFlag,
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
import type { InternalSchemaNode } from '~/types';
import { computed, ref, toRef } from 'vue';
import { inject, provide } from '~/compositions/injectProvide';
import useNode from '~/compositions/useNode';
import { isNodeValid } from '~/compositions/useSchema';
import { useTouchDrag } from '~/compositions/useTouchDrag';
import { setDragEventData } from '~/utils';

const props = defineProps<{
  node: InternalSchemaNode;
}>();

const elementRef = ref<HTMLElement>();
const validator = inject('validator');
const components = inject('components');

const node = toRef(props, 'node');
const { component, error, isShown, modelValue } = useNode(node);
const isNodeValidFlag = computed(() => isNodeValid(node.value, validator, components));

const mode = inject('mode');
const selectedNode = inject('selectedNode');
const formId = inject('formId');

provide('node', node);

function startDrag(e: DragEvent, nodeId: string) {
  setDragEventData(e, formId.value, 'node_id', nodeId);
}

useTouchDrag({
  elementGetter: () => elementRef.value,
  dragData: () => ({ type: 'node_id', value: node.value._id }),
});
</script>

<style>
/** necessary to do proper hovering in nested elements */
.former-draggable[data-node]:hover:not(:has([data-node]:hover)) {
  @apply bg-blue-200 dark:bg-blue-800;
}

.former-draggable[data-node] *:not(input) {
  @apply cursor-pointer;
}
</style>
