<template>
  <div v-if="selectedNode" class="flex flex-col gap-4 w-full">
    <div class="flex gap-2 w-full justify-between border-b-2 dark:border-zinc-400 pb-2">
      <slot name="delete-button" :delete="deleteComponent">
        <button @click="deleteComponent">
          &#128465;
        </button>
      </slot>
      <div class="flex flex-col overflow-hidden items-center">
        <div>{{ selectedNodeType?.label || 'Element' }}:</div>
        <div v-if="selectedNode.name" class="font-bold overflow-hidden whitespace-nowrap text-ellipsis w-full">
          {{ selectedNode.name }}
        </div>
      </div>
      <slot name="unselect-button" :unselect="unselectComponent">
        <button @click="unselectComponent">
          &#10060;
        </button>
      </slot>
    </div>
    <Former
      v-if="selectedNodePropsSchema"
      v-model:data="data"
      :schema="selectedNodePropsSchema"
      mode="edit"
      :components
      :validator
      @valid="$emit('valid', $event)"
    />
    <pre v-else>{{ selectedNode }}</pre>
  </div>
  <slot v-else name="nothing-selected" />
</template>

<script setup lang="ts">
import type { InternalSchemaNode } from '~/types';
import { computed, ref, watch } from 'vue';
import { inject } from '~/compositions/injectProvide';
import { deleteNode, replaceNode, toInternalSchema } from '~/utils';
import Former from './Former.vue';

defineEmits<{
  (e: 'valid', valid: boolean): void;
}>();

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

function unselectComponent() {
  selectedNode.value = undefined;
}

function deleteComponent() {
  if (!selectedNode.value) {
    return;
  }

  deleteNode(schema.value, selectedNode.value._id);
  selectedNode.value = undefined;
}
</script>
