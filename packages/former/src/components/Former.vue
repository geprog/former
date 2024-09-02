<template>
  <div v-for="node in schema" :key="node.name">
    <component
      v-if="_showIf(node)"
      :is="edit ? EditComponent : FormComponent"
      :node
      :model-value="data?.[node.name]"
      @update:model-value="(e: unknown) => setData(node.name, e)"
    >
      <Former
        v-if="node.children"
        :schema="node.children"
        :data="data?.[node.name]"
        @update:data="(e: unknown) => setData(node.name, e)"
      />
    </component>
  </div>
</template>

<script setup lang="ts">
import type { FormData, SchemaNode, FormFieldType } from '~/types';
import FormComponent from './FormComponent.vue';
import EditComponent from './EditComponent.vue';
import { provide } from '~/compositions/injectProvide';

const props = defineProps<{
  components?: { [key: string]: FormFieldType };
  showIf?: (node: SchemaNode) => boolean;
}>();

const schema = defineModel<SchemaNode[]>('schema', { required: true });
provide('schema', schema);

const data = defineModel<FormData>('data', { default: () => {} });
provide('data', data);

const edit = defineModel<boolean>('edit', { default: false });
provide('edit', edit);

if (props.components) {
  provide('components', props.components);
}

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
    throw new Error('No name support is not implemented yet');
  }

  const _data = { ...data.value };
  _data[name] = e;
  data.value = _data;
  // modelValue.value = _data;
}
</script>
