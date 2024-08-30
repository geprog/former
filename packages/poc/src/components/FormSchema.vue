<template>
  <div v-for="node in schema" :key="node.name">
    <label v-if="node.props?.label" :for="node.name">{{ node.props.label }}</label>
    <component
      v-if="_showIf(node)"
      :is="edit ? EditComponent : FormComponent"
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
import { ref, type DefineComponent } from 'vue';
import FormComponent from './FormComponent.vue';
import EditComponent from './EditComponent.vue';

const props = defineProps<{
  edit?: boolean;
  modelValue?: FormData;
  schema: SchemaNode[];
  components: { [key: string]: DefineComponent };
  showIf?: (node: SchemaNode) => boolean;
}>();

const emit = defineEmits<{
  (event: 'update:model-value', e: FormData): void;
}>();

const data = ref<FormData>(props.modelValue || {});

// TODO: watch props.data

function _showIf(node: SchemaNode): boolean {
  if (props.showIf) {
    return props.showIf(node);
  }

  if (!node.if) {
    return true;
  }

  return !!node.if;
}

function setData(name: string | undefined, e: unknown) {
  if (!name) {
    throw new Error('No name support is not implemented yet');
  }

  const _data = { ...data.value };
  _data[name] = e;
  data.value = _data;
  emit('update:model-value', _data);

  console.log('data', name, e);
}
</script>
