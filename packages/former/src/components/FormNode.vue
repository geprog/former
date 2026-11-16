<template>
  <div
    v-if="mode === 'build' || (isShown && (mode !== 'read' || hasContent))"
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
    <component :is="component" v-if="component" v-bind="componentProps" :id="node._id" v-model="modelValue" :mode :error>
      <slot />
    </component>
    <span v-else>Component type not found!</span>
    <span v-if="mode === 'build' && propsError" data-props-error class="p-2 text-sm text-red-500">{{ propsError }}</span>
  </div>
</template>

<script setup lang="ts">
import type { InternalSchemaNode } from '~/types';
import { computed, toRef } from 'vue';
import { inject, provide } from '~/compositions/injectProvide';
import useNode from '~/compositions/useNode';
import { propsOf, setDragEventData } from '~/utils';
import { errorMessage, isNodeValid, useMaybeAsync } from '~/validation';

const props = defineProps<{
  node: InternalSchemaNode;
}>();

const components = inject('components');

const node = toRef(props, 'node');
const { component, error, hasContent, isShown, modelValue } = useNode(node);
const componentProps = computed(() => propsOf(node.value));

const mode = inject('mode');
// the props of the nodes are only edited (and shown as invalid) in build mode,
// a validation failing (e.g. an async schema not reaching a server) is shown with its message,
// as it is otherwise only visible in the props of the node once it is selected
const { result: propsValidation } = useMaybeAsync<boolean | string>(
  () => mode.value !== 'build' || isNodeValid(node.value, components.value),
  true,
  errorMessage,
);
const isNodeValidFlag = computed(() => propsValidation.value === true);
const propsError = computed(() => (typeof propsValidation.value === 'string' ? propsValidation.value : undefined));
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
  @apply bg-blue-200 dark:bg-blue-800;
}

.former-draggable[data-node] *:not(input) {
  @apply cursor-pointer;
}
</style>
