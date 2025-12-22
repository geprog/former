<template>
  <div v-if="mode === 'build'" class="flex flex-col gap-2">
    <div class="flex flex-col gap-4">
      <div v-for="[name, component] in relevantComponents" :key="name" class="flex flex-col gap-2">
        <span>{{ component.label }}</span>

        <div
          class="flex gap-2 w-full items-center cursor-move hover:bg-blue-100 dark:hover:bg-zinc-700"
          draggable="true"
          @dragstart="startDrag($event, name)"
        >
          <span class="drag-handle p-2">::</span>

          <div class="flex flex-grow flex-col border dark:border-zinc-400 rounded p-2 gap-2">
            <div class="pointer-events-none">
              <component :is="component.component" :id="name" :model-value="undefined" :mode>
                <slot />
              </component>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { inject, provide } from '~/compositions/injectProvide';
import { setDragEventData } from '~/utils';

const components = inject('components');
const mode = inject('mode');
const formId = inject('formId');

provide('data', ref({}));
provide('schema', ref([]));

function startDrag(e: DragEvent, nodeType: string) {
  setDragEventData(e, formId.value, 'new_node_type', nodeType);
}

const relevantComponents = Object.entries(components).filter(([, { internal }]) => !internal);
</script>
