<template>
  <div v-if="edit" class="flex flex-col gap-2">
    <span>Add an element by dragging into the form</span>
    <div class="grid grid-cols-2 gap-4 former-drag-container former-add">
      <div v-for="(component, i) in components" :key="i" class="flex flex-col gap-2 former-draggable" :data-type="i">
        <span>{{ component.label }}</span>

        <div class="flex gap-2 w-full items-center cursor-move">
          <span class="drag-handle p-2">::</span>

          <div class="flex flex-grow flex-col border rounded p-2 bg-white gap-2">
            <div class="pointer-events-none">
              <FormComponent
                :node="{
                  _id: '123',
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
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
import FormComponent from './FormComponent.vue';
import { nanoid } from '~/utils';

const components = inject('components');
const schema = inject('schema');
const edit = inject('edit');

let sortable: Sortable | null = null;

function applyDraggable() {
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

    const originalNode = e.dragEvent.source;
    clonedElement = originalNode.cloneNode(true) as HTMLElement;
    originalNode.parentNode?.insertBefore(clonedElement, originalNode.nextSibling);
  });

  // sortable.on('drag:out:container', (e) => {
  //   if (e.overContainer.classList.contains('former-add')) {
  //     if (clonedElement) {
  //       clonedElement.remove();
  //       clonedElement = null;
  //     }
  //   }
  // });

  sortable.on('sortable:stop', (e) => {
    // prevent items from being added to the add container
    if (e.newContainer.classList.contains('former-add')) {
      if (clonedElement) {
        clonedElement.remove();
        clonedElement = null;
      }
      e.cancel();
      return;
    }

    const type = e.dragEvent.originalSource.getAttribute('data-type');
    if (type === null) {
      return;
    }

    // remove the dropped node
    e.dragEvent.source.remove();
    e.cancel(); // we need to cancel to avoid the original node from being removed

    nextTick(() => {
      schema.value.splice(e.newIndex, 0, {
        _id: nanoid(),
        type,
        props: {
          options: [],
        },
      });
    });
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

<style>
.former-draggable.draggable-mirror > span,
.former-draggable.draggable-source--is-dragging > span {
  @apply hidden;
}
</style>
