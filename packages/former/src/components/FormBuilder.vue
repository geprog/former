<template>
  <slot />
  <slot name="typeSelector" :isOpen="indexForNewElement !== undefined" />
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

const selectedElementId = ref<string>();
provide('selectedElementId', selectedElementId);

const generateId = () => `former-${Math.random().toString(36).substring(7)}`;
const indexForNewElement = ref<number>();
provide('newElementHandler', {
  addNewElement(elementType: string) {
    if (elementType && indexForNewElement.value !== undefined) {
      schema.value.splice(indexForNewElement.value + 1, 0, {
        $formkit: elementType,
        id: generateId(),
        name: 'new_field' + schema.value.length,
        label: 'New field' + schema.value.length,
        help: 'This is a new field.',
      });
    }
    indexForNewElement.value = undefined;
  },
  openTypeSelector(atIndex: number) {
    indexForNewElement.value = atIndex;
  },
  cancelTypeSelector() {
    indexForNewElement.value = undefined;
  },
});
</script>
