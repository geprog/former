<template>
  <div v-if="selectedNode" class="flex flex-col gap-4 w-full">
    <div class="flex w-full justify-between">
      <span class="text-lg">{{ selectedNodeType?.label }}{{ selectedNode.name ? ` - ${selectedNode.name}` : '' }}</span>
      <Button @click="selectedNode = undefined">
        x
      </Button>
    </div>
    <Former
      v-if="selectedNodePropsSchema"
      v-model:data="data"
      :schema="selectedNodePropsSchema"
      mode="edit"
      :components
      :validator
    />
    <pre v-else>{{ selectedNode }}</pre>
    <Button @click="deleteComponent">
      Delete
    </Button>
  </div>
  <div v-else>
    Click on an element for being able to adjust the props
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { inject } from '~/compositions/injectProvide';
import Button from '~/sample/Button.vue';
import type { InternalSchemaNode } from '~/types';
import { deleteNode, replaceNode, toInternalSchema } from '~/utils';
import Former from './Former.vue';

const components = inject('components');
const schema = inject('schema');
const validator = inject('validator');

const selectedNode = inject('selectedNode');

const selectedNodeType = computed(() => (selectedNode.value ? components[selectedNode.value.type] : undefined));

const selectedNodePropsSchema = ref<InternalSchemaNode[]>();

watch(
  selectedNodeType,
  (_selectedNodeType) => {
    selectedNodePropsSchema.value = _selectedNodeType ? toInternalSchema(_selectedNodeType.propsSchema) : undefined;
  },
  { immediate: true },
);

const data = computed({
  get() {
    if (!selectedNode.value) {
      return {};
    }

    return {
      $name: selectedNode.value.name,
      ...selectedNode.value.props,
    };
  },
  set(_data) {
    if (!selectedNode.value) {
      return;
    }

    const props = _data as { $name?: string };
    const name = props.$name;
    if (name !== undefined) {
      delete props.$name;
    }
    const updatedNode = {
      ...selectedNode.value,
      name: name ?? selectedNode.value.name,
      props,
    };
    replaceNode(schema.value, updatedNode);
    selectedNode.value = updatedNode;
  },
});

function deleteComponent() {
  if (!selectedNode.value) {
    return;
  }

  deleteNode(schema.value, selectedNode.value._id);
  selectedNode.value = undefined;
}
</script>
