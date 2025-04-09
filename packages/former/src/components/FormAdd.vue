<template>
  <div v-if="mode === 'build'" class="flex flex-col gap-2">
    <div class="flex flex-col gap-4">
      <div v-for="(component, i) in components" :key="i" class="flex flex-col gap-2">
        <span>{{ component.label }}</span>

        <div
          :ref="el => refs[i] = el"
          class="flex gap-2 w-full items-center cursor-move hover:bg-blue-100 dark:hover:bg-zinc-700"
          draggable="true"
          @dragstart="startDrag($event, i as string)"
        >
          <span class="drag-handle p-2">::</span>

          <div class="flex flex-grow flex-col border dark:border-zinc-400 rounded p-2 gap-2">
            <div class="pointer-events-none">
              <component :is="component.component" :id="i" :model-value="undefined" :mode>
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
import { computed, onMounted, ref } from 'vue';
import { inject, provide } from '~/compositions/injectProvide';
import { useTouchDrag } from '~/compositions/useTouchDrag';
import { setDragEventData } from '~/utils';

const refs = ref<HTMLElement[]>([]);
const components = inject('components');
const mode = inject('mode');
const formId = inject('formId');
const componentList = computed(() =>
  Object.entries(components).map(([type, config]) => ({
    type,
    ...config,
  })),
);

const dummySchema = ref([]);
const dummyData = ref({});
provide('data', dummySchema);
provide('schema', dummyData);

function startDrag(e: DragEvent, nodeType: string) {
  setDragEventData(e, formId.value, 'new_node_type', nodeType);
}

onMounted(() => {
  componentList.value.forEach((component, i) => {
    useTouchDrag({
      elementGetter: () => refs.value[i],
      dragData: () => ({ type: 'new_node_type', value: component.type }),
    });
  });
});
</script>
