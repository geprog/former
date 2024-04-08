<template>
  <div v-if="selectedElement">
    <FormKitSchema
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
import { formFieldOptionSchemas } from './formFieldOptions';

const schema = inject('schema');
const selectedElementId = inject('selectedElementId');
const getId = (element: any) => (element as { id?: string }).id;
const selectedElement = computed({
  get() {
    return selectedElementId.value && schema.value.find((node) => getId(node) === selectedElementId.value);
  },
  set() {
    throw new Error('Cannot set element');
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
}
</script>
