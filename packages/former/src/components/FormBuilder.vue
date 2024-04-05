<template>
  <slot />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { type FormKitSchemaNode } from '@formkit/core';
import { provide } from '~/compositions/injectProvide';

const schema = defineModel<FormKitSchemaNode[]>('schema', { required: true });
provide('schema', schema);

const data = defineModel<Record<string, any>>('data', { default: {} });
provide('data', data);

const mode = defineModel<'edit' | 'preview'>('mode', { default: 'edit' as const });
provide('mode', mode);

const selectedElement = ref<FormKitSchemaNode>();
provide('selectedElement', selectedElement);
</script>
