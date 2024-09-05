<template>
  <div
    class="former-drag-container"
    :class="{
      'former-edit': edit,
    }"
    @dragover.prevent
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

function onDrop(e: DragEvent) {
  const dropTarget = (e.target as HTMLElement).closest('.former-draggable');
  const parent = (e.target as HTMLElement)?.closest('.former-drag-container');
  const parentNodeId = parent?.getAttribute('data-parent-node');

  if (!dropTarget || !parent) {
    console.error('No drop target or parent found', { dropTarget, parent });
    e.preventDefault();
    return;
  }

  let newIndex = Array.from(parent?.children ?? []).indexOf(dropTarget);

  // if the dropzone has no children, add the new node as the first child
  if (newIndex === -1 && parent.children.length === 0) {
    newIndex = 0;
  } else {
    // if the dropzone has children, add the new node after the drop target
    newIndex += 1;
  }

  const newNodeType = e.dataTransfer?.getData('new_node_type');
  if (newNodeType) {
    const newNode = {
      _id: nanoid(),
      type: newNodeType,
      props: {},
    } satisfies InternalSchemaNode;

    const _schema = [...toValue(schema.value)];
    addNode(_schema, parentNodeId ?? null, newIndex, newNode);
    schema.value = _schema;

    selectedNode.value = newNode;
    return;
  }

  const nodeId = e.dataTransfer?.getData('node_id');
  if (nodeId) {
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
