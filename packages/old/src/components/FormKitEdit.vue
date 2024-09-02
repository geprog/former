<template>
  <div v-if="mode === 'edit'" class="flex flex-col handle" @click="selectedFormFieldId = id">
    <div
      class="flex gap-2 p-2 rounded-lg bg-white element transition-colors border-2 border-transparent duration-7600 w-full"
      :class="{ '!border-blue-600': selectedFormFieldId === id }"
    >
      <FormKit v-bind="$attrs">
        <slot />
      </FormKit>
    </div>

    <div
      class="w-full flex justify-center items-center mt-2 btn-add opacity-0 gap-2 duration-700 transition-all relative"
    >
      <div class="flex-grow h-0.5 rounded-sm bg-blue-600" />
      <button type="button" aria-details="Add component" @click="indexForNewFormField = index">
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
import { type FormKitSchemaNode } from '@formkit/core';
import { FormKit } from '@formkit/vue';
import { computed, useAttrs } from 'vue';
import { inject } from '~/compositions/injectProvide';

defineOptions({
  inheritAttrs: false,
});

const element = useAttrs() as FormKitSchemaNode;
const mode = inject('mode');
const schema = inject('schema');
const selectedFormFieldId = inject('selectedFormFieldId');
const indexForNewFormField = inject('indexForNewFormField');

const getId = (element: any) => (element as { id?: string }).id;
const id = computed(() => getId(element));
const index = computed(() => schema.value.findIndex((e) => getId(e) === id.value));
</script>

<style>
.handle:hover:not(:has(.handle:hover)) > .element {
  @apply border-blue-600;
}

.handle:hover:not(:has(.handle:hover)) > .btn-add {
  @apply opacity-100;
}
</style>
