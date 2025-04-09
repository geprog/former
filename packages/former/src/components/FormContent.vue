<template>
  <FormRenderer
    @dragover.prevent="dragOver"
    @dragenter.prevent
    @dragleave.prevent="dragLeave"
    @touchmove.prevent="dragOver"
    @touchend="onTouchDrop"
  />
</template>

<script setup lang="ts">
import type { InternalSchemaNode } from '~/types';
import { onBeforeUnmount, onMounted, ref, toValue } from 'vue';
import { inject } from '~/compositions/injectProvide';
import { addNode, deleteNode, getFormIdFromEvent, getNode, nanoid, nodePosition } from '~/utils';
import FormRenderer from './FormRenderer.vue';

const mode = inject('mode');
const schema = inject('schema');
const selectedNode = inject('selectedNode');
const formId = inject('formId');

const draggingClasses = ['bg-blue-200', 'dark:bg-blue-800'];

let lastDropTarget: HTMLElement | null = null;
let lastDropzone: HTMLElement | null = null;
function getDropDetails(e: DragEvent) {
  // add a placeholder to indicate where the element will be dropped
  lastDropTarget = (e.target as HTMLElement).closest('.former-draggable') ?? lastDropTarget;
  lastDropzone = (e.target as HTMLElement)?.closest('.former-drag-container') ?? lastDropzone;
  if (!document.body.contains(lastDropTarget)) {
    lastDropTarget = null;
  }

  if (!lastDropzone) {
    throw new Error('No dropzone found');
  }

  // if draggable is parent of drop target => add first child to dropzone
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

  // if there is no other node => allow to add first node
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

  if (!lastDropTarget) {
    throw new Error('No drop target found');
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
  const eventFormId = getFormIdFromEvent(e);
  if (mode.value !== 'build' || formId.value !== eventFormId) {
    // do not handle any drag if not in builder mode
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
  if (e.currentTarget && e.relatedTarget && (e.currentTarget as Node).contains(e.relatedTarget as Node)) {
    // doing this check to avoid flikkering of the gray background in the drag container
    return;
  }
  if (placeholder) {
    placeholder.remove();
  }
  placeholder = null;
  if (activeDropzone) {
    activeDropzone.classList.remove(...draggingClasses);
  }
  activeDropzone = null;
}

function onDrop(e: DragEvent) {
  const eventFormId = getFormIdFromEvent(e);
  if (mode.value !== 'build' || formId.value !== eventFormId) {
    // do not handle any drag if not in builder mode
    return;
  }

  if (placeholder) {
    placeholder.remove();
  }

  if (activeDropzone) {
    activeDropzone.classList.remove(...draggingClasses);
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
    addNode(_schema, newPosition, newNode);
    schema.value = _schema;

    selectedNode.value = newNode;
    return;
  }

  const nodeId = e.dataTransfer?.getData('node_id');
  if (nodeId) {
    const node = getNode(schema.value, nodeId)!;
    const currentPosition = nodePosition(schema.value, nodeId, 'above')!;

    const _schema = [...toValue(schema.value)];

    deleteNode(_schema, nodeId);

    if (currentPosition.parentId === newPosition.parentId && currentPosition.index < newPosition.index) {
      // we need to reduce the index if the element got deleted in the same parent at a lower position
      newPosition.index--;
    }
    addNode(_schema, newPosition, node);

    schema.value = _schema;
  }
}

const activeTouchData = ref<{ type: string; value: string } | null>(null);

function onTouchDrop(e: TouchEvent) {
  const touch = e.changedTouches[0];
  const simulatedEvent = new DragEvent('drop', {
    clientX: touch.clientX,
    clientY: touch.clientY,
  });
  // simulate internal state transition
  Object.assign(simulatedEvent, activeTouchData); // Custom logic
  onDrop(simulatedEvent as any);
}

onMounted(() => {
  window.addEventListener('drop', onDrop);
});

onBeforeUnmount(() => {
  window.removeEventListener('drop', onDrop);
});
</script>
