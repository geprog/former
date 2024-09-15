<template>
  <component v-if="component" :is="component" v-bind="node.props" :node-path v-model="modelValue" :error>
    <slot />
  </component>
  <span v-else>Component type not found!</span>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import { inject } from '~/compositions/injectProvide';
import type { InternalSchemaNode } from '~/types';

const props = defineProps<{
  node: InternalSchemaNode;
  nodePath?: string[];
}>();

const components = inject('components');
const errorMessage = inject('errorMessage', true);

const modelValue = defineModel<unknown>();

const component = computed(() => components[props.node.type]?.component);

const node = toRef(props, 'node');

const error = computed(() => {
  const message = errorMessage(node.value, modelValue.value);
  if (message === true) {
    return undefined;
  }
  return message;
})
</script>
