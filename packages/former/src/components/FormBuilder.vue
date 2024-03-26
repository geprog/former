<template>
  <slot />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { FormKitSchemaNode } from '@formkit/core';
import { provide } from '../compositions/injectProvide';

const schema = defineModel<FormKitSchemaNode[]>('schema', {
  required: true,
});
provide('schema', schema);

const mode = ref<'edit' | 'preview'>('edit');
provide('mode', mode);
</script>
