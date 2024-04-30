<template>
  <slot />
  <teleport to="body">
    <FormFieldTypeSelector v-if="indexForNewElement !== undefined" />
  </teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { type FormKitSchemaNode } from '@formkit/core';
import { provide } from '~/compositions/injectProvide';
import FormFieldTypeSelector from './FormFieldTypeSelector.vue';

const schema = defineModel<FormKitSchemaNode[]>('schema', { required: true });
provide('schema', schema);

const data = defineModel<Record<string, any>>('data', { default: {} });
provide('data', data);

const mode = defineModel<'edit' | 'preview'>('mode', { default: 'edit' as const });
provide('mode', mode);

const selectedFormFieldId = ref<string>();
provide('selectedFormFieldId', selectedFormFieldId);

const indexForNewElement = ref<number>();
provide('indexForNewFormField', indexForNewElement);
</script>
