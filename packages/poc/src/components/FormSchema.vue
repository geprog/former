<template>
  <div v-for="node in schema" :key="node.name">
    <label v-if="node.props?.label" :for="node.name">{{ node.props.label }} - {{ data[node.name] }}</label>
    <component
      v-if="validateIf(node)"
      :is="components[node.type]"
      v-bind="node.props"
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
import type { SchemaNode } from '@/types';
import { ref, type DefineComponent } from 'vue';

type Data = Record<string, any>;

const props = defineProps<{
  modelValue?: Data;
  schema: SchemaNode[];
  components: { [key: string]: DefineComponent };
}>();

const emit = defineEmits<{
  (event: 'update:model-value', e: Data): void;
}>();

const data = ref<Data>(props.modelValue || {});

// TODO: watch props.data

function validateIf(node: SchemaNode): boolean {
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
