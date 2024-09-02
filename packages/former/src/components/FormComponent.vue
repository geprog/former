<template>
  <component :is="components[node.type].component" v-bind="node.props" v-model="modelValue">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { inject } from '~/compositions/injectProvide';
import type { FormData, SchemaNode } from '~/types';

defineProps<{
  node: SchemaNode;
}>();

const components = inject('components');

const modelValue = defineModel<FormData>({
  required: true,
});
</script>
