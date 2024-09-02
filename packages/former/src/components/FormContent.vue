<template>
  <div v-for="node in schema" :key="node.name">
    <component
      v-if="_showIf(node)"
      :is="edit ? EditComponent : FormComponent"
      :node
      :model-value="node.name ? data?.[node.name] : undefined"
      @update:model-value="(e: unknown) => setData(node.name, e)"
    >
      <FormContent
        v-if="node.children"
        :schema="node.children"
        :data="node.name ? data?.[node.name] : undefined"
        @update:data="(e: unknown) => setData(node.name, e)"
      />
    </component>
  </div>
</template>

<script setup lang="ts">
import type { SchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';
import EditComponent from './EditComponent.vue';
import { inject } from '~/compositions/injectProvide';

const props = defineProps<{
  schema: SchemaNode[];
  showIf?: (node: SchemaNode) => boolean;
}>();

const data = inject('data');

const edit = inject('edit');

function _showIf(node: SchemaNode): boolean {
  if (props.showIf) {
    return props.showIf(node);
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
  // modelValue.value = _data;
}
</script>
