<template>
  <div
    class="relative"
    :class="{
      'former-drag-container former-edit': edit,
    }"
    @dragover.prevent="dragOver"
    @dragenter.prevent
  >
    <FormRenderer v-model:data="data" :edit :schema />
  </div>
</template>

<script setup lang="ts">
import { inject } from '~/compositions/injectProvide';
import FormRenderer from './FormRenderer.vue';
import { addNode, deleteNode, getNode, nanoid, nodePosition } from '~/utils';
import type { InternalSchemaNode } from '~/types';
import { onBeforeUnmount, onMounted, toValue } from 'vue';

const edit = inject('edit');
const schema = inject('schema');
const data = inject('data');
const selectedNode = inject('selectedNode');

let lastDropTarget: HTMLElement | null = null;
let lastDropzone: HTMLElement | null = null;
function getDropDetails(e: DragEvent) {
  // add a placeholder to indicate where the element will be dropped
  lastDropTarget = ((e.target as HTMLElement).closest('.former-draggable') as HTMLElement) ?? lastDropTarget;
  lastDropzone = ((e.target as HTMLElement)?.closest('.former-drag-container') as HTMLElement) ?? lastDropzone;

  // if draggable is parent of drop target => add first child to dropzone
  if (lastDropTarget && lastDropTarget.contains(lastDropzone)) {
    return {
      dropTarget: null,
      dropzone: lastDropzone,
      newPosition: {
        parentId: lastDropTarget.getAttribute('data-node'),
        index: 0,
      },
      aboveTarget: true,
    };
  }

  // if there is no other node => allow to add first node
  if (!lastDropTarget && lastDropzone) {
    return {
      dropTarget: null,
      dropzone: lastDropzone,
      newPosition: {
        parentId: lastDropzone.getAttribute('data-parent-node') ?? null,
        index: 0,
      },
      aboveTarget: true,
    };
  }

  if (!lastDropTarget) {
    throw new Error('No drop target found');
  }

  if (!lastDropzone) {
    throw new Error('No dropzone found');
  }

  const dropTargetId = lastDropTarget.getAttribute('data-node');
  const aboveTarget = e.clientY < lastDropTarget.getBoundingClientRect().top + lastDropTarget.offsetHeight / 2;

  if (!dropTargetId) {
    throw new Error('No drop target id found');
  }

  const newPosition = nodePosition(schema.value, dropTargetId, aboveTarget ? 'above' : 'below');

  // TODO: prevent adding groups to itself as a child
  // this check doesn't work as getData returns null
  const nodeId = e.dataTransfer?.getData('node_id');
  if (newPosition?.parentId === nodeId) {
    return null;
  }

  return {
    dropTarget: lastDropTarget,
    dropzone: lastDropzone,
    newPosition,
    aboveTarget,
  };
}

let placeholder: HTMLElement | null = null;
let activeDropzone: HTMLElement | null = null;
function dragOver(e: DragEvent) {
  if (!edit.value) {
    // do not handle any drag if not edit in edit mode
    return;
  }
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'move';

  const details = getDropDetails(e);
  if (!details) {
    return;
  }
  const { dropTarget, aboveTarget, dropzone } = details;

  if (placeholder) {
    placeholder.remove();
  }

  placeholder = document.createElement('div');
  placeholder.classList.add(
    'bg-gray-800',
    'rounded',
    'absolute',
    'z-10',
    'left-0',
    'right-0',
    'h-1',
    'transform',
    '-translate-y-1/2',
  );

  if (dropTarget) {
    if (aboveTarget) {
      placeholder.style.top = '0';
      dropTarget.prepend(placeholder);
    } else {
      placeholder.style.bottom = '0';
      dropTarget.append(placeholder);
    }
  } else {
    dropzone.appendChild(placeholder);
  }

  if (activeDropzone) {
    activeDropzone.classList.remove('bg-gray-200');
  }
  dropzone.classList.add('bg-gray-200');
  activeDropzone = dropzone;
}

function onDrop(e: DragEvent) {
  if (placeholder) {
    placeholder.remove();
  }

  if (activeDropzone) {
    activeDropzone.classList.remove('bg-gray-200');
  }

  const details = getDropDetails(e);
  if (!details) {
    return;
  }

  const { newPosition } = details;
  if (!newPosition) {
    return;
  }

  const newNodeType = e.dataTransfer?.getData('new_node_type');
  if (newNodeType) {
    const newNode = {
      _id: nanoid(),
      type: newNodeType,
      props: {},
    } satisfies InternalSchemaNode;

    const _schema = [...toValue(schema.value)];
    addNode(_schema, newPosition.parentId ?? null, newPosition.index, newNode);
    schema.value = _schema;

    selectedNode.value = newNode;
    return;
  }

  const nodeId = e.dataTransfer?.getData('node_id');
  if (nodeId) {
    const node = getNode(schema.value, nodeId)!;

    const _schema = [...toValue(schema.value)];

    deleteNode(_schema, nodeId);
    addNode(_schema, newPosition.parentId ?? null, newPosition.index, node);

    schema.value = _schema;
  }
}

onMounted(() => {
  window.addEventListener('drop', onDrop);
});

onBeforeUnmount(() => {
  window.removeEventListener('drop', onDrop);
});
</script>

<style>
/* some minimal box to allow users to be able to add elements to an empty group */
.former-edit .former-drag-container,
.former-edit.former-drag-container {
  @apply min-h-24 min-w-24 w-full;
}
</style>
