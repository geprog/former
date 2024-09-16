<template>
  <component v-if="component" :is="component" v-bind="node.props" :node-path v-model="modelValue" :error>
    <slot />
  </component>
  <span v-else>Component type not found!</span>
</template>

<script setup lang="ts">
import { computed, toRef, watch } from 'vue';
import { inject } from '~/compositions/injectProvide';
import type { InternalSchemaNode } from '~/types';

const props = defineProps<{
  node: InternalSchemaNode;
  nodePath?: string[];
}>();

const emit = defineEmits<{
  (e: 'valid', valid: boolean): void
}>();

const components = inject('components');
const validator = inject('validator', true);

const modelValue = defineModel<unknown>();

const component = computed(() => components[props.node.type]?.component);

const node = toRef(props, 'node');

const error = computed(() => {
  const message = validator(node.value, modelValue.value);
  if (message === true) {
    return undefined;
  }
  return message;
});

watch(error, () => {
  emit('valid', error.value === undefined);
}, { immediate: true })
</script>
