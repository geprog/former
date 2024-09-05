<template>
  <div v-if="edit" class="flex flex-col gap-2">
    <div class="flex flex-col gap-4">
      <div v-for="(component, i) in components" :key="i" class="flex flex-col gap-2">
        <span>{{ component.label }}</span>

        <div
          class="flex gap-2 w-full items-center cursor-move hover:bg-zinc-100"
          draggable="true"
          @dragstart="startDrag($event, 'new', i as string)"
        >
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
import FormComponent from './FormComponent.vue';

const components = inject('components');
const edit = inject('edit');

function startDrag(e: DragEvent, source: 'new' | 'existing', nodeId: string) {
  if (e.dataTransfer === null) {
    return;
  }

  e.dataTransfer.dropEffect = 'move';
  e.dataTransfer.effectAllowed = 'move';
  if (source === 'new') {
    e.dataTransfer.setData('node_type', nodeId);
  } else {
    e.dataTransfer.setData('node_id', nodeId);
  }
}
</script>
