<template>
  <slot :selected-node="selectedNode">
    <FormContent />
  </slot>
</template>

<script setup lang="ts">
import type { FormData, SchemaNode, FormFieldType, InternalSchemaNode } from '~/types';
import { provide } from '~/compositions/injectProvide';
import { ref, watch } from 'vue';
import FormContent from './FormContent.vue';
import { toInternalSchema, toSchema } from '~/utils';

const props = defineProps<{
  components: { [key: string]: FormFieldType };
  showIf?: (node: SchemaNode, nodePath: string[], data: FormData) => boolean;
  errorMessage?: (node: SchemaNode, tyepData: FormData) => true | string;
}>();

const schema = defineModel<SchemaNode[]>('schema', { required: true });

const internalSchema = ref<InternalSchemaNode[]>(toInternalSchema(schema.value));
provide('schema', internalSchema);

// TODO: allow to change the schema from the outside
// watch(schema, (value) => {
//   internalSchema.value = toInternalSchema(value);
// });

watch(
  internalSchema,
  (value) => {
    schema.value = toSchema(value);
  },
  { deep: true },
);

const data = defineModel<FormData>('data', { default: () => ({}) });
provide('data', data);

const edit = defineModel<boolean>('edit', { default: false });
provide('edit', edit);

provide('components', props.components);
provide('showIf', props.showIf || (() => true));
provide('errorMessage', props.errorMessage || (()=> true));

const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
provide('selectedNode', selectedNode);
</script>
