<template>
  <div
    class="former-drag-container"
    :class="{
      'former-edit': edit,
    }"
    @dragover.prevent="dragOver"
    @dragenter.prevent
    @drop="onDrop($event)"
  >
    <FormRenderer v-model:data="data" :edit :schema />
  </div>
</template>

<script setup lang="ts">
import { inject } from '~/compositions/injectProvide';
import FormRenderer from './FormRenderer.vue';
import { addNode, deleteNode, getNode, nanoid } from '~/utils';
import type { InternalSchemaNode } from '~/types';
import { toValue } from 'vue';

const edit = inject('edit');
const schema = inject('schema');
const data = inject('data');
const selectedNode = inject('selectedNode');

function getDropDetails(e: DragEvent) {
  // add a placeholder to indicate where the element will be dropped
  const dropTarget = (e.target as HTMLElement).closest('.former-draggable') as HTMLElement;
  const dropzone = (e.target as HTMLElement)?.closest('.former-drag-container');

  if (!dropTarget || !dropzone) {
    return null;
  }

  const aboveTarget = e.clientY < dropTarget.getBoundingClientRect().top + dropTarget.offsetHeight / 2;

  let newIndex = Array.from(dropzone?.children ?? []).indexOf(dropTarget);

  // if the dropzone has no children, add the new node as the first child
  if (newIndex === -1 && dropzone.children.length === 0) {
    newIndex = 0;
  } else {
    newIndex += aboveTarget ? 0 : 1;
  }

  return {
    dropTarget,
    parent: dropzone,
    newIndex,
    aboveTarget,
  };
}

let placeholder: HTMLElement | null = null;
function dragOver(e: DragEvent) {
  e.preventDefault();

  e.dataTransfer!.dropEffect = 'move';

  const details = getDropDetails(e);
  if (!details) {
    return;
  }
  const { dropTarget, aboveTarget } = details;

  if (placeholder) {
    placeholder.remove();
  }

  placeholder = document.createElement('div');
  placeholder.classList.add('bg-gray-800', 'rounded', 'absolute', 'z-10', 'left-0', 'right-0', 'h-1');

  if (aboveTarget) {
    placeholder.style.top = '-1rem';
    dropTarget.prepend(placeholder);
  } else {
    placeholder.style.bottom = '-1rem';
    dropTarget.append(placeholder);
  }
}

function onDrop(e: DragEvent) {
  if (placeholder) {
    placeholder.remove();
  }

  const details = getDropDetails(e);
  if (!details) {
    return;
  }
  const { dropTarget, newIndex, parent } = details;
  const parentNodeId = parent.getAttribute('data-parent-node');

  if (!dropTarget || !parent) {
    console.error('No drop target or parent found', { dropTarget, parent });
    e.preventDefault();
    return;
  }

  const newNodeType = e.dataTransfer?.getData('new_node_type');
  if (newNodeType) {
    console.log('adding new item to', parentNodeId, 'at', newIndex);
    const newNode = {
      _id: nanoid(),
      type: newNodeType,
      props: {
        label: nanoid(),
      },
    } satisfies InternalSchemaNode;

    const _schema = [...toValue(schema.value)];
    addNode(_schema, parentNodeId ?? null, newIndex, newNode);
    schema.value = _schema;

    selectedNode.value = newNode;
    return;
  }

  const nodeId = e.dataTransfer?.getData('node_id');
  if (nodeId) {
    console.log('moving item', nodeId, 'to', parentNodeId, 'at', newIndex);
    const node = getNode(schema.value, nodeId)!;

    const _schema = [...toValue(schema.value)];

    deleteNode(_schema, nodeId);
    addNode(_schema, parentNodeId ?? null, newIndex, node);

    schema.value = _schema;
  }
}
</script>

<style>
/* some minimal box to allow users to be able to add elements to an empty group */
.former-edit .former-drag-container {
  @apply min-h-24 min-w-24 w-full;
}
</style>
