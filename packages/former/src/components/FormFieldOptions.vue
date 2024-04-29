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
import { formFieldOptionSchemas } from './formFieldSchema';
import { FormKit } from '@formkit/vue';
import FormKitSchemaReactive from './FormKitSchemaReactive.vue';
import { isFormKitSchemaNode } from '~/compositions/useFormKitUtils';

const schema = inject('schema');
const selectedElementId = inject('selectedElementId');
const getId = (element: any) => (element as { id?: string }).id;
const selectedElement = computed({
  get() {
    if (!selectedElementId.value) {
      return;
    }
    const node = schema.value.find((node) => getId(node) === selectedElementId.value);
    if (!isFormKitSchemaNode(node)) {
      throw new Error('Selected element is not a FormKit schema node');
    }
    return node;
  },
  set(_element) {
    if (!_element) return;
    schema.value = schema.value.map((node) => (getId(node) === selectedElementId.value ? _element : node));
  },
});

const selectedElementType = computed(() => {
  const node = selectedElement.value as { $formkit?: string; props?: { type: string } };
  return (node?.$formkit || node?.props?.type) as keyof typeof formFieldOptionSchemas;
});

const selectedElementOptionsSchema = computed(() =>
  selectedElementType.value ? formFieldOptionSchemas[selectedElementType.value] : undefined,
);

function deleteComponent() {
  const index = schema.value.findIndex((node) => getId(node) === selectedElementId.value);
  schema.value.splice(index, 1);
  selectedElementId.value = undefined;
}
</script>
