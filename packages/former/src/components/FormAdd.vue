<template>
  <div v-if="mode === 'build'" class="flex flex-col gap-2">
    <div class="flex flex-col gap-4">
      <div v-for="(component, i) in components" :key="i" class="flex flex-col gap-2">
        <span>{{ component.label }}</span>

        <div
          class="flex gap-2 w-full items-center cursor-move hover:bg-zinc-100"
          draggable="true"
          @dragstart="startDrag($event, i as string)"
        >
          <span class="drag-handle p-2">::</span>

          <div class="flex flex-grow flex-col border rounded p-2 bg-white gap-2">
            <div class="pointer-events-none">
              <FormComponent
                :node="{
                  _id: '',
                  type: i as string,
                }"
                :model-value="undefined"
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
const mode = inject('mode');

function startDrag(e: DragEvent, nodeType: string) {
  if (e.dataTransfer === null) {
    return;
  }

  e.dataTransfer.dropEffect = 'move';
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('new_node_type', nodeType);
}
</script>
