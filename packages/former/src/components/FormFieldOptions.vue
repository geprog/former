<template>
  <div v-if="selectedNode" class="flex flex-col gap-4">
    <span class="text-green-500">{{ selectedNode._id }}</span>

    <pre>{{ selectedNode }}</pre>

    <span class="text-lg">{{ selectedNodeType?.label }}</span>
    <FormRenderer v-if="selectedNodePropsSchema" v-model:data="data" :schema="selectedNodePropsSchema" />
    <pre v-else>{{ selectedNode }}</pre>
    <button @click="deleteComponent" class="border bg-slate-100 hover:bg-slate-300 py-1 px-2 rounded">Delete</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { inject } from '~/compositions/injectProvide';
import FormRenderer from './FormRenderer.vue';
import { deleteNode, replaceNode, toInternalSchema } from '~/utils';

const components = inject('components');
const schema = inject('schema');

const selectedNode = inject('selectedNode');

const selectedNodeType = computed(() => (selectedNode.value ? components[selectedNode.value.type] : undefined));

const selectedNodePropsSchema = computed(() =>
  selectedNodeType.value ? toInternalSchema(selectedNodeType.value?.propsSchema) : undefined,
);

const data = computed({
  get() {
    return selectedNode.value?.props;
  },
  set(_data) {
    if (!selectedNode.value) {
      return;
    }

    const updatedNode = { ...selectedNode.value, props: _data };
    replaceNode(schema.value, updatedNode);
    selectedNode.value = updatedNode;
  },
});

function deleteComponent() {
  if (!selectedNode.value) {
    return;
  }

  deleteNode(schema.value, selectedNode.value);
  selectedNode.value = undefined;
}
</script>
