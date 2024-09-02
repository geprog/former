<template>
  <div v-for="node in schema" :key="node.name">
    <component
      v-if="_showIf(node)"
      :is="mode === 'edit' ? EditComponent : FormComponent"
      :node
      :components
      :model-value="data?.[node.name]"
      @update:model-value="(e: unknown) => setData(node.name, e)"
    >
      <FormSchema
        v-if="node.children"
        :schema="node.children"
        :components="components"
        :model-value="data?.[node.name]"
        @update:model-value="(e: unknown) => setData(node.name, e)"
      />
    </component>
  </div>
</template>

<script setup lang="ts">
import type { FormData, SchemaNode } from '~/types';
import { ref, watch } from 'vue';
import FormComponent from './FormComponent.vue';
import EditComponent from './EditComponent.vue';
import { inject } from '~/compositions/injectProvide';

const props = defineProps<{
  showIf?: (node: SchemaNode) => boolean;
}>();

const mode = inject('mode');
const schema = inject('schema');
const components = inject('components');

const modelValue = defineModel<FormData>();

const data = ref<FormData>(modelValue.value || {});

watch(modelValue, (value) => {
  if (value) {
    data.value = value;
  }
});

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
  modelValue.value = _data;
}
</script>
