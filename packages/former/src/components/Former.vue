<template>
  <slot :selected-node="selectedNode">
    <FormContent />
  </slot>
</template>

<script setup lang="ts">
import { cloneDeep, isEqual } from 'lodash';
import { computed, ref, toRef, watch } from 'vue';
import { provide } from '~/compositions/injectProvide';
import type { FormData, FormFieldType, InternalSchemaNode, Mode, SchemaNode, ShowIfPredicate, Texts, Validator } from '~/types';
import { generateFormId, toInternalSchema, toSchema } from '~/utils';
import FormContent from './FormContent.vue';

const props = withDefaults(defineProps<{
  components: { [key: string]: FormFieldType };
  showIf?: ShowIfPredicate;
  validator?: Validator;
  mode?: Mode;
  texts?: Partial<Texts>;
}>(), { mode: 'edit', texts: () => ({}) });

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
const wrappedData = ref<FormData>({});
watch(data, () => {
  if (!isEqual(data.value, wrappedData.value)) {
    wrappedData.value = data.value;
  }
}, { immediate: true });

watch(wrappedData, () => {
  data.value = cloneDeep(wrappedData.value);
}, { deep: true });

provide('data', wrappedData);

provide('mode', toRef(props, 'mode'));

provide('components', props.components);
provide('showIf', (node: SchemaNode) => {
  if (!props.showIf) {
    return true;
  }
  return props.showIf(node, wrappedData.value);
});
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

const texts = toRef(props, 'texts');
provide('texts', computed<Texts>(() => ({ dragHint: 'Here you can drag elements', ...texts.value })));
</script>
