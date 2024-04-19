<template>
  <div class="flex flex-col items-start gap-4 m-4 justify-center">
    <div ref="el" class="w-full">
      <FormKitSchemaReactive :schema :library v-model:data="data" />
    </div>
    <div class="mt-4 mx-auto">
      <button v-if="schema.length < 1" type="button" aria-details="Add component" @click="addComponent">
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
import { ref } from 'vue';
import { useSortable } from '@vueuse/integrations/useSortable';
import { markRaw } from 'vue';
import FormKitEdit from './FormKitEdit.vue';
import { inject } from '~/compositions/injectProvide';
import { computed } from 'vue';
import { type FormKitSchemaNode, isSugar } from '@formkit/core';
import { isFormKitSchemaNode } from '~/compositions/useFormKitUtils';
import FormKitSchemaReactive from './FormKitSchemaReactive.vue';

function getFormKitId(node: any): string | undefined {
  return isFormKitSchemaNode(node) ? (node as unknown as { id: string }).id : undefined;
}

const generateId = () => `former-${Math.random().toString(36).substring(7)}`;

function addIdsToSchema(schema: FormKitSchemaNode[]) {
  return schema.map((node, index) => {
    // TODO: support nested elements
    // if (isFormKitSchemaNode(node) && node.children) {
    //   node.children = addIdsToSchema(node.children as FormKitSchemaNode[]); // TODO: check children types
    // }

    if (isFormKitSchemaNode(node) && !getFormKitId(node)) {
      if (isSugar(node)) {
        node.id = generateId();
      } else if (node.props) {
        node.props.id = generateId();
      }
      node.key = generateId();
    }

    return node;
  });
}

function removeGeneratedIds(schema: FormKitSchemaNode[]) {
  return schema.map((node) => {
    // TODO: support nested elements
    // if (isFormKitSchemaNode(node) && node.children) {
    //   node.children = addIdsToSchema(node.children as FormKitSchemaNode[]); // TODO: check children types
    // }

    const id = getFormKitId(node);
    if (isFormKitSchemaNode(node) && id && id.startsWith('former-')) {
      if (isSugar(node)) {
        delete node.id;
      } else if (node.props) {
        delete node.props.id;
      }
      delete node.key;
    }

    return node;
  });
}

const originalSchema = inject('schema');
const schema = computed({
  get() {
    return addIdsToSchema(originalSchema.value);
  },
  set(_schema) {
    originalSchema.value = removeGeneratedIds(_schema);
  },
});

const data = inject('data');

const library = markRaw({
  FormKit: FormKitEdit,
});

const el = ref<HTMLElement | null>(null);
useSortable(
  el as unknown as string, // TODO: fix this type
  schema,
  {
    handle: '.handle',
    // animation: 200,
  },
);

function addComponent() {
  schema.value = [
    ...schema.value,
    {
      $formkit: 'text',
      name: 'new_field',
      label: 'New field',
    },
  ];
}
</script>
