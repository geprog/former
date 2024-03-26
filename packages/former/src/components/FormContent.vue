<template>
  <div class="flex flex-col items-start gap-4 m-4 justify-center">
    <FormKit
      type="button"
      :label="mode === 'preview' ? 'Edit' : 'Preview'"
      :onClick="() => (mode = mode === 'edit' ? 'preview' : 'edit')"
    />
    <div ref="el">
      <FormKitSchema :schema :library />
    </div>
    <div class="mt-4 mx-auto">
      <FormKit v-if="schema.length === 1" type="button" label="Add component" :onClick="addComponent" />
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
