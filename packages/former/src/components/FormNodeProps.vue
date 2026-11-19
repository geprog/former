<template>
  <div v-if="selectedNode" class="flex flex-col gap-4 w-full">
    <div class="flex gap-2 w-full justify-between border-b-2 dark:border-zinc-400 pb-2">
      <div class="flex gap-2 items-center shrink-0">
        <slot name="delete-button" :delete="deleteComponent">
          <button @click="deleteComponent">
            &#128465;
          </button>
        </slot>
        <slot
          name="node-actions"
          :node="toSchemaNode(selectedNode)"
          :path="selectedNodePath.map(toSchemaNode)"
          :add-node="addNode"
          :remove-node="removeNode"
        />
      </div>
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
      @valid="$emit('valid', $event)"
    />
    <pre v-else>{{ selectedNode }}</pre>
  </div>
  <slot v-else name="nothing-selected" />
</template>

<script setup lang="ts">
import type { EditedNode, InternalSchemaNode, SchemaNode } from '~/types';
import { computed, ref, toRaw, watch } from 'vue';
import { inject, provide } from '~/compositions/injectProvide';
import { deleteNode, getNodePath, addNode as insertNodeAt, nodePosition, replaceNode, toInternalSchema, toInternalSchemaNode, toSchemaNode } from '~/utils';
import Former from './Former.vue';

defineEmits<{
  (e: 'valid', valid: boolean): void;
}>();

const components = inject('components');
const schema = inject('schema');

const selectedNode = inject('selectedNode');
const selectedNodePath = computed(() => (selectedNode.value
  ? getNodePath(schema.value, selectedNode.value._id) ?? []
  : []));

// the props form sees which node it edits, e.g. for validations or fields referring to the rest of the schema
provide('editedNode', computed<EditedNode | undefined>(() => (selectedNode.value
  ? {
      node: selectedNode.value,
      path: selectedNodePath.value,
      schema: schema.value,
      // the node may come from a read-only view of the schema (see `useEditedNode`)
      select: (node: SchemaNode) => {
        selectedNode.value = toRaw(node) as InternalSchemaNode;
      },
    }
  : undefined)));

const selectedNodeType = computed(() => (selectedNode.value ? components.value[selectedNode.value.type] : undefined));

const selectedNodePropsSchema = ref<InternalSchemaNode[]>();

watch(
  selectedNodeType,
  (_selectedNodeType) => {
    selectedNodePropsSchema.value = _selectedNodeType
      ? toInternalSchema(_selectedNodeType.propsSchema)
      : undefined;
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

    const props = _data as { $name?: string } & Record<string, unknown>;
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

function addNode(newNode: SchemaNode) {
  const current = selectedNode.value;
  if (!current) {
    return;
  }
  const internal = toInternalSchemaNode(newNode);
  const position = nodePosition(schema.value, current._id, 'below');
  if (!position) {
    return;
  }
  insertNodeAt(schema.value, position, internal);
  selectedNode.value = internal;
}

function removeNode() {
  deleteComponent();
}

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
