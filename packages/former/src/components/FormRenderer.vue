<template>
  <div v-for="(node, i) in schema" :key="i">
    <component
      v-if="_showIf(node)"
      :is="edit ? EditComponent : FormComponent"
      :node
      :model-value="node.name ? data?.[node.name] : undefined"
      @update:model-value="(e: unknown) => setData(node.name, e)"
    >
      <FormRenderer
        v-if="node.children"
        :schema="node.children"
        :edit
        :data="node.name ? data?.[node.name] : undefined"
        @update:data="(e: unknown) => setData(node.name, e)"
      />
    </component>
  </div>
</template>

<script setup lang="ts">
import type { FormData, SchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';
import EditComponent from './EditComponent.vue';

const props = defineProps<{
  schema?: SchemaNode[];
  edit?: boolean;
  showIf?: (node: SchemaNode) => boolean;
}>();

const data = defineModel<FormData>('data', { default: () => ({}) });

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
