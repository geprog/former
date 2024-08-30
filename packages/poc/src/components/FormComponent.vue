<template>
  <label v-if="node.props?.label" :for="node.name">{{ node.props.label }}</label>
  <component :is="components[node.type]" v-bind="node.props" v-model="modelValue">
    <slot />
  </component>
</template>

<script setup lang="ts">
import type { DefineComponent } from 'vue';
import type { FormData, SchemaNode } from '~/types';

defineProps<{
  node: SchemaNode;
  components: { [key: string]: DefineComponent };
}>();

const modelValue = defineModel<FormData>({
  required: true,
});
</script>
