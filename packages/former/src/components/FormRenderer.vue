<template>
  <FormNode
    v-for="node in internalSchema"
    :key="node._id"
    v-model:data="data"
    :node
    :repeated-form-identifier
  />
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import type { FormData, InternalSchemaNode, NodeChildren } from '~/types';
import FormNode from './FormNode.vue';

const props = defineProps<{
  schema?: NodeChildren<InternalSchemaNode>;
  category?: string;
  repeatedFormIdentifier?: string | number;
}>();

const data = defineModel<FormData>('data', { default: () => ({}) });

const schema = toRef(props, 'schema');
const category = toRef(props, 'category');

const internalSchema = computed(() => {
  if (!schema.value) {
    return [];
  }
  if (Array.isArray(schema.value)) {
    if (category.value && category.value !== 'default') {
      return [];
    }
    return schema.value;
  }
  return schema.value[category.value || 'default'] || [];
});
</script>
