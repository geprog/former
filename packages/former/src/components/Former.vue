<template>
  <slot :selected-node="selectedNode">
    <FormContent @valid="isValid = $event" />
  </slot>
</template>

<script setup lang="ts">
import { ref, toRef, watch } from 'vue';
import { provide } from '~/compositions/injectProvide';
import type { FieldData, FormData, FormFieldType, InternalSchemaNode, Mode, SchemaNode } from '~/types';
import { toInternalSchema, toSchema } from '~/utils';
import FormContent from './FormContent.vue';

const props = withDefaults(defineProps<{
  components: { [key: string]: FormFieldType };
  showIf?: (node: SchemaNode, data: FormData) => boolean;
  validator?: (node: SchemaNode, data: FieldData) => true | string;
  mode?: Mode;
}>(), { mode: 'edit' });

const emit = defineEmits<{
  (e: 'valid', valid: boolean): void;
}>();

const schema = defineModel<SchemaNode[]>('schema', { required: true });

const isValid = ref(true);
watch(
  isValid,
  () => {
    emit('valid', isValid.value);
  },
  { immediate: true },
);

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

provide('mode', toRef(props, 'mode'));

provide('components', props.components);
provide('showIf', props.showIf || (() => true));
provide('validator', props.validator || (() => true));

const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
provide('selectedNode', selectedNode);
</script>
