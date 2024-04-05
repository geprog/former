<template>
  <div v-if="mode === 'edit'" class="group flex flex-col handle" @click="selectedElement = element">
    <div
      class="flex gap-2 p-2 rounded-lg bg-white transition-colors group-hover:border-blue-600 border border-transparent duration-7600 w-full"
    >
      <!-- <button type="button" class="opacity-0 group-hover:opacity-100 handle cursor-grab">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
          <path
            fill="currentColor"
            d="M108 60a16 16 0 1 1-16-16a16 16 0 0 1 16 16m56 16a16 16 0 1 0-16-16a16 16 0 0 0 16 16m-72 36a16 16 0 1 0 16 16a16 16 0 0 0-16-16m72 0a16 16 0 1 0 16 16a16 16 0 0 0-16-16m-72 68a16 16 0 1 0 16 16a16 16 0 0 0-16-16m72 0a16 16 0 1 0 16 16a16 16 0 0 0-16-16"
          />
        </svg>
      </button> -->

      <div class="w-full">
        <FormKit v-bind="$attrs">
          <slot />
        </FormKit>
      </div>
    </div>

    <div
      class="w-full flex justify-center items-center mt-2 opacity-0 gap-2 group-hover:opacity-100 duration-700 transition-all relative"
    >
      <div class="flex-grow h-0.5 rounded-sm bg-blue-600" />
      <button type="button" aria-details="Add component" @click="addComponentAfterThisOne">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="text-blue-600">
          <path
            fill="currentColor"
            d="M11 17h2v-4h4v-2h-4V7h-2v4H7v2h4zm-6 4q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zM5 5v14z"
          />
        </svg>
      </button>
      <div class="flex-grow h-0.5 rounded-sm bg-blue-600" />
    </div>
  </div>
  <FormKit v-else v-bind="$attrs">
    <slot />
  </FormKit>
</template>

<script setup lang="ts">
import { type FormKitSchemaNode, getNode } from '@formkit/core';
import { FormKit } from '@formkit/vue';
import { computed } from 'vue';
import { toRaw } from 'vue';
import { useAttrs } from 'vue';
import { inject } from '~/compositions/injectProvide';

defineOptions({
  inheritAttrs: false,
});

const element = useAttrs() as FormKitSchemaNode;
const mode = inject('mode');
const schema = inject('schema');
const selectedElement = inject('selectedElement');

const generateId = () => `former-${Math.random().toString(36).substring(7)}`;
const getId = (element: any) => (element as { id?: string }).id;
const id = computed(() => getId(element));

function addComponentAfterThisOne() {
  if (!id.value) {
    throw new Error('This element should not have an add button');
  }

  const index = schema.value.findIndex((e) => getId(e) === id.value);
  schema.value.splice(index + 1, 0, {
    $formkit: 'text',
    id: generateId(),
    name: 'new_field' + schema.value.length,
    label: 'New field' + schema.value.length,
    help: 'This is a new field.',
  });
}
</script>
