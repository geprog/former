<template>
  <component v-if="component" :is="component" v-bind="node.props" v-model="modelValue">
    <slot />
  </component>
  <span v-else>Component type not found!</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { inject } from '~/compositions/injectProvide';
import type { InternalSchemaNode } from '~/types';

const props = defineProps<{
  node: InternalSchemaNode;
}>();

const components = inject('components');

const modelValue = defineModel<unknown>();

const component = computed(() => components[props.node.type]?.component);
</script>
