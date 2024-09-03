<template>
  <slot />
</template>

<script setup lang="ts">
import type { FormData, SchemaNode, FormFieldType, InternalSchemaNode } from '~/types';
import { provide } from '~/compositions/injectProvide';
import { computed, ref, watch } from 'vue';
import { toInternalSchema, toSchema } from '~/utils';

const props = defineProps<{
  components: { [key: string]: FormFieldType };
  showIf?: (node: SchemaNode) => boolean;
}>();

const schema = defineModel<SchemaNode[]>('schema', { required: true });

// const internalSchema = computed<InternalSchemaNode[]>({
//   get() {
//     return toInternalSchema(schema.value);
//   },
//   set(_schema) {
//     schema.value = toSchema(_schema);
//   },
// });
const internalSchema = ref<InternalSchemaNode[]>(toInternalSchema(schema.value));
provide('schema', internalSchema);

watch(schema, (value) => {
  internalSchema.value = toInternalSchema(value);
});

const data = defineModel<FormData>('data', { default: () => ({}) });
provide('data', data);

const edit = defineModel<boolean>('edit', { default: false });
provide('edit', edit);

provide('components', props.components);

provide('selectedNode', ref<InternalSchemaNode | undefined>(undefined));
</script>
