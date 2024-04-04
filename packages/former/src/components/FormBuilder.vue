<template>
  <slot />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { FormKitSchemaNode } from '@formkit/core';
import { provide } from '~/compositions/injectProvide';

const props = defineProps<{
  schema: FormKitSchemaNode[];
}>();

const emit = defineEmits<{
  (event: 'update:schema', schema: FormKitSchemaNode[]): void;
}>();

const schema = ref<FormKitSchemaNode[]>(props.schema);
watch(schema, (newSchema) => {
  emit('update:schema', newSchema);
});
provide('schema', schema);

const mode = ref<'edit' | 'preview'>('edit');
provide('mode', mode);
</script>
