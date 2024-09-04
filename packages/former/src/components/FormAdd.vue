<template>
  <div v-if="edit" class="flex flex-col gap-2">
    <div class="grid grid-cols-2 gap-4 former-drag-container former-add">
      <div v-for="(component, i) in components" :key="i" class="flex flex-col gap-2 former-draggable" :data-type="i">
        <span>{{ component.label }}</span>

        <div class="flex gap-2 w-full items-center cursor-move">
          <span class="drag-handle p-2">::</span>

          <div class="flex flex-grow flex-col border rounded p-2 bg-white gap-2">
            <div class="pointer-events-none">
              <FormComponent
                :node="{
                  _id: '',
                  type: i as string,
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { inject } from '~/compositions/injectProvide';
import { Sortable } from '@shopify/draggable';
import { nextTick, onBeforeUnmount, onMounted, toValue, watch } from 'vue';
import FormComponent from './FormComponent.vue';
import { addNode, deleteNode, getNode, nanoid } from '~/utils';
import type { InternalSchemaNode } from '~/types';

const components = inject('components');
const schema = inject('schema');
const edit = inject('edit');

let sortable: Sortable | null = null;

function applyDraggable() {
  if (!window) {
    return;
  }

  const droppableContainers = document.querySelectorAll('.former-drag-container');
  if (droppableContainers.length === 0) {
    console.error('No droppable containers found');
    return;
  }

  sortable = new Sortable(droppableContainers, {
    draggable: '.former-draggable',
    distance: 10,
    mirror: {
      constrainDimensions: true,
    },
  });

  let clonedElement: HTMLElement | null = null;

  sortable.on('sortable:start', (e) => {
    if (!e.startContainer.classList.contains('former-add')) {
      return;
    }

    console.log('cloning element');
    const originalNode = e.dragEvent.source;
    clonedElement = originalNode.cloneNode(true) as HTMLElement;
    originalNode.parentNode?.insertBefore(clonedElement, originalNode.nextSibling);
  });

  sortable.on('drag:stop', (e) => {
    if (e.sourceContainer.classList.contains('former-add')) {
      e.cancel();
    }
  });

  sortable.on('sortable:stop', (e) => {
    // prevent items from being added to the add container
    if (e.newContainer.classList.contains('former-add')) {
      console.log('adding item to add container');

      if (clonedElement) {
        clonedElement.remove();
        clonedElement = null;
      }
      e.cancel();
      return;
    }

    const newParentGroup = e.newContainer.getAttribute('data-parent-node');

    // check if we are dragging a new item
    if (e.oldContainer.classList.contains('former-add')) {
      console.log('adding new item');

      const type = e.dragEvent.originalSource.getAttribute('data-type');
      if (type === null) {
        return;
      }

      // remove the dropped node
      e.dragEvent.source.remove();
      e.cancel();

      nextTick(() => {
        const newNode = {
          _id: nanoid(),
          type,
          props: {
            options: [],
          },
        } satisfies InternalSchemaNode;

        addNode(schema.value, newParentGroup, e.newIndex, newNode);
      });
    } else {
      console.log('moving item');

      // we are moving an existing item
      const nodeId = e.dragEvent.source.getAttribute('data-node');

      if (nodeId === null) {
        throw new Error('Missing data-node attribute');
      }

      const node = getNode(schema.value, nodeId)!;

      // was moved to a different group
      const _schema = [...toValue(schema.value)];

      deleteNode(_schema, nodeId);
      addNode(_schema, newParentGroup, e.newIndex, node);

      nextTick(() => {
        schema.value = _schema;
      });
    }
  });
}

function destroyDraggable() {
  sortable?.destroy();
  sortable = null;
}

onMounted(applyDraggable);
onBeforeUnmount(destroyDraggable);

watch(
  [edit, schema],
  () => {
    destroyDraggable();
    nextTick(applyDraggable);
  },
  { deep: true },
);
</script>

<style scoped>
.former-add .draggable-source--is-dragging {
  /* @apply hidden; */
}
</style>
