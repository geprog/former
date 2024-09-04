<template>
  <div v-for="(node, i) in schema" :key="i" class="former-draggable" :data-node="node._id">
    <component
      v-if="_showIf(node)"
      :is="edit ? EditComponent : FormComponent"
      :node
      :model-value="node.name ? data?.[node.name] : undefined"
      @update:model-value="(e: unknown) => setData(node.name, e)"
    >
      <div class="former-drag-container" :data-parent-node="node._id">
        <FormRenderer
          v-if="node.children"
          :schema="node.children"
          :edit
          :data="node.name ? data?.[node.name] : undefined"
          @update:data="(e: unknown) => setData(node.name, e)"
        />
      </div>
    </component>
  </div>
</template>

<script setup lang="ts">
import type { FormData, InternalSchemaNode, SchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';
import EditComponent from './EditComponent.vue';
import { inject } from '~/compositions/injectProvide';

defineProps<{
  schema?: InternalSchemaNode[];
  edit?: boolean;
}>();

const data = defineModel<FormData>('data', { default: () => ({}) });

const showIf = inject('showIf', false);

function _showIf(node: SchemaNode): boolean {
  if (showIf) {
    return showIf(node, data.value);
  }

  // TODO: Implement more complex logic
  if (!node.if) {
    return true;
  }

  return true;
}

function setData(name: string | undefined, e: unknown) {
  if (!name) {
    return;
  }

  const _data = { ...data.value };
  _data[name] = e;
  data.value = _data;
}
</script>
