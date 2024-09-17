<template>
  <slot :selected-node="selectedNode">
    <FormContent @valid="isValid = $event"/>
  </slot>
</template>

<script setup lang="ts">
import type { FormData, SchemaNode, FormFieldType, InternalSchemaNode, Mode } from '~/types';
import { provide } from '~/compositions/injectProvide';
import { ref, watch } from 'vue';
import FormContent from './FormContent.vue';
import { toInternalSchema, toSchema } from '~/utils';

const props = defineProps<{
  components: { [key: string]: FormFieldType };
  showIf?: (node: SchemaNode, nodePath: string[], data: FormData) => boolean;
  validator?: (node: SchemaNode, tyepData: FormData) => true | string;
}>();

const emit = defineEmits<{
  (e: 'valid', valid: boolean): void
}>();

const schema = defineModel<SchemaNode[]>('schema', { required: true });

const isValid = ref(true);
watch(isValid, () => {
  emit('valid', isValid.value);
}, { immediate: true,  });

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

const mode = defineModel<Mode>('mode', { default: 'edit'} );
provide('mode', mode);

provide('components', props.components);
provide('showIf', props.showIf || (() => true));
provide('validator', props.validator || (()=> true));

const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
provide('selectedNode', selectedNode);
</script>
