<template>
  <div v-if="mode === 'edit'" class="group flex flex-col handle">
    <div
      class="flex gap-2 group-hover:border-blue-600 border border-transparent p-2 rounded-lg bg-white transition-colors duration-200 w-full"
    >
      <div class="w-full">
        <FormKit v-bind="$attrs" />
      </div>

      <div class="ml-auto gap-4 opacity-0 group-hover:opacity-100 duration-200 transition-all">
        <FormKit type="button" label="Edit" :onClick="edit" />
        <FormKit type="button" label="Delete" :onClick="onDelete" />
      </div>
    </div>

    <div
      class="w-full flex justify-center items-center mt-2 opacity-0 gap-2 group-hover:opacity-100 duration-700 transition-all relative"
    >
      <div class="flex-grow h-1 rounded-sm bg-blue-600" />
      <button type="button" aria-details="Add component" @click="addAfter">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="text-blue-600">
          <path
            fill="currentColor"
            d="M11 17h2v-4h4v-2h-4V7h-2v4H7v2h4zm-6 4q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zM5 5v14z"
          />
        </svg>
      </button>
      <div class="flex-grow h-1 rounded-sm bg-blue-600" />
    </div>
  </div>
  <FormKit v-else v-bind="$attrs" />
</template>

<script setup lang="ts">
import { FormKit } from '@formkit/vue';
import { inject } from '~/compositions/injectProvide';

const mode = inject('mode');

defineProps<{
  onDelete?: () => void;
  addAfter?: () => void;
  edit?: () => void;
}>();
</script>
