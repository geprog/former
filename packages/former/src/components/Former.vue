<template>
  <slot>
    <FormContent />
  </slot>
</template>

<script setup lang="ts">
import type { FormData, SchemaNode, FormFieldType } from '~/types';
import { provide } from '~/compositions/injectProvide';
import { ref } from 'vue';
import FormContent from './FormContent.vue';

const props = defineProps<{
  components: { [key: string]: FormFieldType };
  showIf?: (node: SchemaNode) => boolean;
}>();

const schema = defineModel<SchemaNode[]>('schema', { required: true });
provide('schema', schema);

// watch(schema, (value) => {
//   internalSchema.value = toInternalSchema(value);
// });

// watch(
//   internalSchema,
//   (value) => {
//     schema.value = value;
//   },
//   { deep: true },
// );

const data = defineModel<FormData>('data', { default: () => ({}) });
provide('data', data);

const edit = defineModel<boolean>('edit', { default: false });
provide('edit', edit);

provide('components', props.components);

provide('selectedNode', ref<SchemaNode | undefined>(undefined));
</script>
