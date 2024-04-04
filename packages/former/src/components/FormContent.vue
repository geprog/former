<template>
  <div class="flex flex-col items-start gap-4 m-4 justify-center">
    <FormKit
      type="button"
      :label="mode === 'preview' ? 'Edit' : 'Preview'"
      :onClick="() => (mode = mode === 'edit' ? 'preview' : 'edit')"
    />
    <div ref="el" class="w-full">
      <FormKitSchema :schema :library />
    </div>
    <div class="mt-4 mx-auto">
      <button v-if="schema.length === 1" type="button" aria-details="Add component" @click="addComponent()">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="text-blue-600">
          <path
            fill="currentColor"
            d="M11 17h2v-4h4v-2h-4V7h-2v4H7v2h4zm-6 4q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zM5 5v14z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FormKitSchema, FormKit } from '@formkit/vue';
import { ref } from 'vue';
import { useSortable } from '@vueuse/integrations/useSortable';
import { markRaw } from 'vue';
import FormKitEdit from './FormKitEdit.vue';
import { inject } from '~/compositions/injectProvide';
import type { FormKitSchemaComponent, FormKitSchemaNode } from '@formkit/core';

const schema = inject('schema');
const mode = inject('mode');
const library = markRaw({
  FormKit: FormKitEdit,
});

function getComponentId(node: FormKitSchemaNode): number | undefined {
  return typeof node === 'object' && (node as FormKitSchemaComponent)?.props?.id;
}

function addComponent(insertId?: number) {
  const id = new Date().getTime();

  const a = typeof insertId === 'number' ? insertId : schema.value.length;
  schema.value.splice(a, 0, {
    $cmp: 'FormKit',
    props: {
      id,
      isEdit: true,
      type: 'text',
      name: 'new_field',
      label: 'New field' + schema.value.length,
      help: 'This is a new field.',
      onDelete: () => {
        console.log('Delete');
        schema.value = schema.value.filter((node) => getComponentId(node) !== id);
      },
      addAfter: () => {
        const index = schema.value.findIndex((node) => getComponentId(node) === id);
        addComponent(index + 1);
      },
      edit: () => {
        // editingId.value = id;
      },
    },
  });
}

const el = ref<HTMLElement | null>(null);
useSortable(
  el as unknown as string, // TODO: fix this type
  schema,
  {
    handle: '.handle',
    animation: 200,
  },
);
</script>
