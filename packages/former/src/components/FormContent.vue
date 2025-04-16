<template>
  <FormRenderer
    @dragover.prevent="dragOver"
    @dragenter.prevent
    @dragleave.prevent="dragLeave"
  />
</template>

<script setup lang="ts">
import type { InternalSchemaNode } from '~/types';
import { onBeforeUnmount, onMounted, ref, toValue } from 'vue';
import { inject } from '~/compositions/injectProvide';
import { isTouchDragging, useTouchDrag } from '~/compositions/useTouchDrag';
import { addNode, deleteNode, getFormIdFromEvent, getNode, nanoid, nodePosition } from '~/utils';
import FormRenderer from './FormRenderer.vue';

const { enable: enableTouchDrag, disable: disableTouchDrag } = useTouchDrag();
const mode = inject('mode');
const schema = inject('schema');
const selectedNode = inject('selectedNode');
const formId = inject('formId');

const draggingClasses = ['bg-blue-200', 'dark:bg-blue-800'];

const isDropping = ref(false); // Prevent multiple drop events
const lastDroppedNodeId = ref<string | null>(null); // Track node ID to prevent duplicate drops

let lastDropTarget: HTMLElement | null = null;
let lastDropzone: HTMLElement | null = null;

function getDropDetails(e: DragEvent) {
  lastDropTarget = (e.target as HTMLElement).closest('.former-draggable') ?? lastDropTarget;
  lastDropzone = (e.target as HTMLElement)?.closest('.former-drag-container') ?? lastDropzone;
  if (!document.body.contains(lastDropTarget))
    lastDropTarget = null;
  if (!lastDropzone)
    throw new Error('No dropzone found');

  if (lastDropTarget && lastDropTarget.contains(lastDropzone)) {
    return {
      dropTarget: null,
      dropzone: lastDropzone,
      newPosition: {
        parentId: lastDropTarget.getAttribute('data-node'),
        category: lastDropzone.getAttribute('data-category') ?? null,
        index: 0,
      },
      aboveTarget: true,
    };
  }

  if (!lastDropTarget && lastDropzone) {
    return {
      dropTarget: null,
      dropzone: lastDropzone,
      newPosition: {
        parentId: lastDropzone.getAttribute('data-parent-node') ?? null,
        category: lastDropzone.getAttribute('data-category') ?? null,
        index: 0,
      },
      aboveTarget: true,
    };
  }

  if (!lastDropTarget)
    throw new Error('No drop target found');

  const dropTargetId = lastDropTarget.getAttribute('data-node');
  const aboveTarget = e.clientY < lastDropTarget.getBoundingClientRect().top + lastDropTarget.offsetHeight / 2;

  if (!dropTargetId)
    throw new Error('No drop target id found');

  const newPosition = nodePosition(schema.value, dropTargetId, aboveTarget ? 'above' : 'below');

  const nodeId = e.dataTransfer?.getData('node_id');
  if (newPosition?.parentId === nodeId)
    return null;

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
  const eventFormId = getFormIdFromEvent(e);
  if (mode.value !== 'build' || formId.value !== eventFormId)
    return;
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'move';

  const details = getDropDetails(e);
  if (!details)
    return;

  const { dropTarget, dropzone } = details;

  if (placeholder)
    placeholder.remove();

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

  const container = dropTarget || dropzone;

  const targetRect = container.getBoundingClientRect();
  const isAbove = e.clientY < targetRect.top + targetRect.height / 2;

  if (dropTarget) {
    if (isAbove) {
      placeholder.style.top = '0';
      dropTarget.prepend(placeholder);
    }
    else {
      placeholder.style.bottom = '0';
      dropTarget.append(placeholder);
    }
  }
  else {
    dropzone.appendChild(placeholder);
  }

  if (activeDropzone) {
    activeDropzone.classList.remove(...draggingClasses);
  }
  dropzone.classList.add(...draggingClasses);
  activeDropzone = dropzone;
}

function dragLeave(e: DragEvent) {
  if (
    e.currentTarget
    && e.relatedTarget
    && (e.currentTarget as Node).contains(e.relatedTarget as Node)
  ) {
    return;
  }
  if (placeholder)
    placeholder.remove();
  placeholder = null;
  if (activeDropzone) {
    activeDropzone.classList.remove(...draggingClasses);
  }
  activeDropzone = null;
}

function onDrop(e: DragEvent) {
  const customEvent = e as DragEvent & { synthetic?: boolean };

  if (isTouchDragging.value && !customEvent.synthetic)
    return;

  // Prevent multiple drops
  if (isDropping.value)
    return;

  isDropping.value = true;

  const eventFormId = getFormIdFromEvent(e);
  if (mode.value !== 'build' || formId.value !== eventFormId)
    return;
  e.preventDefault();

  if (placeholder)
    placeholder.remove();
  if (activeDropzone)
    activeDropzone.classList.remove(...draggingClasses);

  const details = getDropDetails(e);
  if (!details || !details.newPosition)
    return;

  const { newPosition } = details;

  const newNodeType = e.dataTransfer?.getData('new_node_type');
  if (newNodeType) {
    const newNodeId = nanoid();

    // Skip if node already dropped
    if (lastDroppedNodeId.value === newNodeId) {
      isDropping.value = false;
      return;
    }

    lastDroppedNodeId.value = newNodeId;

    const newNode = {
      _id: newNodeId,
      type: newNodeType,
      props: {},
    } satisfies InternalSchemaNode;

    const _schema = [...toValue(schema.value)];
    addNode(_schema, newPosition, newNode);
    schema.value = _schema;
    selectedNode.value = newNode;

    setTimeout(() => {
      lastDroppedNodeId.value = null;
      isDropping.value = false;
    }, 300);
    return;
  }

  const nodeId = e.dataTransfer?.getData('node_id');
  if (nodeId) {
    // Skip if node already dropped
    if (lastDroppedNodeId.value === nodeId) {
      isDropping.value = false;
      return;
    }

    lastDroppedNodeId.value = nodeId;

    const node = getNode(schema.value, nodeId);
    if (!node)
      return;

    const currentPosition = nodePosition(schema.value, nodeId, 'above');
    if (!currentPosition)
      return;

    const _schema = [...toValue(schema.value)];
    deleteNode(_schema, nodeId);

    if (
      currentPosition.parentId === newPosition.parentId
      && currentPosition.index < newPosition.index
    ) {
      newPosition.index--;
    }

    addNode(_schema, newPosition, node);
    schema.value = _schema;

    setTimeout(() => {
      lastDroppedNodeId.value = null;
      isDropping.value = false;
    }, 300);
  }
}

onMounted(() => {
  window.addEventListener('drop', onDrop);
  enableTouchDrag();
});

onBeforeUnmount(() => {
  window.removeEventListener('drop', onDrop);
  disableTouchDrag();
});
</script>
