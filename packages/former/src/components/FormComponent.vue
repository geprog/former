<template>
  <component :is="getComponent(node)" v-bind="node.props" v-model="modelValue">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { inject } from '~/compositions/injectProvide';
import type { SchemaNode } from '~/types';

defineProps<{
  node: SchemaNode;
}>();

const components = inject('components');

const modelValue = defineModel<unknown>();

function getComponent(node: SchemaNode) {
  const component = components[node.type];

  if (!component) {
    throw new Error(`Component not found for type: ${node.type}`);
  }

  return components[node.type].component;
}
</script>
