<template>
  <div v-if="selectedNode" class="flex flex-col gap-4 w-full">
    <div class="flex w-full justify-between">
      <span class="text-lg">{{ selectedNodeType?.label }}{{ selectedNode.name ? ` - ${selectedNode.name}` : '' }}</span>
      <Button @click="selectedNode = undefined">x</Button>
    </div>
    <FormRenderer v-if="selectedNodePropsSchema" v-model:data="data" :schema="selectedNodePropsSchema" />
    <pre v-else>{{ selectedNode }}</pre>
    <Button @click="deleteComponent">Delete</Button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { inject } from '~/compositions/injectProvide';
import FormRenderer from './FormRenderer.vue';
import { deleteNode, replaceNode } from '~/utils';
import Button from '~/sample/Button.vue';

const components = inject('components');
const schema = inject('schema');

const selectedNode = inject('selectedNode');

const selectedNodeType = computed(() => (selectedNode.value ? components[selectedNode.value.type] : undefined));

const selectedNodePropsSchema = computed(() =>
  selectedNodeType.value ? selectedNodeType.value?.propsSchema : undefined,
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
