<template>
  <FormContent :schema="schema" />
</template>

<script setup lang="ts">
import type { FormData, SchemaNode, FormFieldType } from '~/types';
import { provide } from '~/compositions/injectProvide';
import FormContent from './FormContent.vue';

const props = defineProps<{
  components: { [key: string]: FormFieldType };
  showIf?: (node: SchemaNode) => boolean;
}>();

const schema = defineModel<SchemaNode[]>('schema', { required: true });
provide('schema', schema);

const data = defineModel<FormData>({ default: () => ({}) });
provide('data', data);

const edit = defineModel<boolean>('edit', { default: false });
provide('edit', edit);

provide('components', props.components);
</script>
