<template>
  <slot :selected-node="selectedNode">
    <FormContent />
  </slot>
</template>

<script setup lang="ts">
import { isEqual } from 'lodash';
import { computed, ref, toRef, watch } from 'vue';
import { provide } from '~/compositions/injectProvide';
import type { FormData, FormFieldType, InternalSchemaNode, Mode, SchemaNode, ShowIfPredicate, Validator } from '~/types';
import { generateFormId, toInternalSchema, toSchema } from '~/utils';
import FormContent from './FormContent.vue';

const props = withDefaults(defineProps<{
  components: { [key: string]: FormFieldType };
  showIf?: ShowIfPredicate;
  validator?: Validator;
  mode?: Mode;
}>(), { mode: 'edit' });

const emit = defineEmits<{
  (e: 'valid', valid: boolean): void;
}>();

const schema = defineModel<SchemaNode[]>('schema', { required: true });

const internalSchema = ref<InternalSchemaNode[]>([]);
provide('schema', internalSchema);

const formId = ref(generateFormId());
provide('formId', formId);

const latestSchema = ref<SchemaNode[]>();

watch(schema, (value) => {
  if (!isEqual(latestSchema.value, value)) {
    internalSchema.value = toInternalSchema(value);
  }
}, { immediate: true });

watch(
  internalSchema,
  (value) => {
    const newSchema = toSchema(value);
    latestSchema.value = newSchema;
    schema.value = newSchema;
  },
  { deep: true },
);

const data = defineModel<FormData>('data', { default: () => ({}) });
provide('data', data);

provide('mode', toRef(props, 'mode'));

provide('components', props.components);
provide('showIf', props.showIf || (() => true));
provide('validator', props.validator || (() => true));

const validityMap = ref<Record<string, boolean | undefined>>({});
provide('validityMap', validityMap);

const isValid = computed(() => {
  return Object.values(validityMap.value).every(
    validFlag => validFlag !== false,
  );
});

watch(
  isValid,
  () => {
    emit('valid', isValid.value);
  },
  { immediate: true },
);

const selectedNode = ref<InternalSchemaNode | undefined>(undefined);
provide('selectedNode', selectedNode);
</script>
