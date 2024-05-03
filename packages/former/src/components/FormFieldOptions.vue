<template>
  <div v-if="selectedElement">
    <FormKitSchemaReactive
      v-if="selectedElementOptionsSchema"
      :schema="selectedElementOptionsSchema"
      v-model:data="selectedElement"
    />
    <pre v-else>{{ selectedElement }}</pre>
    <FormKit type="button" label="Delete" :onClick="deleteComponent" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { inject } from '~/compositions/injectProvide';
import { formFieldTypes } from './formFieldTypes';
import { FormKit } from '@formkit/vue';
import FormKitSchemaReactive from './FormKitSchemaReactive.vue';
import { isFormKitSchemaNode } from '~/compositions/useFormKitUtils';
import type { FormKitNode } from '@formkit/core';

const schema = inject('schema');
const selectedFormFieldId = inject('selectedFormFieldId');
const getId = (element: any) => (element as { id?: string }).id;
const selectedElement = computed({
  get() {
    if (!selectedFormFieldId.value) {
      return;
    }
    const node = schema.value.find((node) => getId(node) === selectedFormFieldId.value);
    if (!isFormKitSchemaNode(node)) {
      throw new Error('Selected element is not a FormKit schema node');
    }
    return {
      ...node,
      addItem: (node: FormKitNode) => () => node.input(node._value.concat([''])),
      stringify: JSON.stringify,
    };
  },
  set(_element) {
    if (!_element) return;
    schema.value = schema.value.map((node) => (getId(node) === selectedFormFieldId.value ? _element : node));
  },
});

const selectedElementType = computed(() => {
  const node = selectedElement.value as { $formkit?: string; props?: { type: string } };
  return (node?.$formkit || node?.props?.type) as keyof typeof formFieldTypes;
});

const selectedElementOptionsSchema = computed(() =>
  selectedElementType.value ? formFieldTypes[selectedElementType.value]?.schema : undefined,
);

function deleteComponent() {
  const index = schema.value.findIndex((node) => getId(node) === selectedFormFieldId.value);
  schema.value.splice(index, 1);
  selectedFormFieldId.value = undefined;
}
</script>
