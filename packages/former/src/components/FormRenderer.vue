<template>
  <FormDragContainer :category>
    <FormNode
      v-for="node in internalSchema"
      :key="node._id"
      :node
    />
  </FormDragContainer>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import { inject } from '~/compositions/injectProvide';
import FormDragContainer from './FormDragContainer.vue';
import FormNode from './FormNode.vue';

const props = defineProps<{
  category?: string;
}>();

const parentNode = inject('node', false);
const rootSchema = inject('schema');

const schema = computed(() => {
  if (parentNode) {
    return parentNode.value.children;
  }
  return rootSchema.value;
});

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
