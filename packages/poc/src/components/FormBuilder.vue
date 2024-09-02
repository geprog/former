<template>
  <slot />
  <!-- <teleport to="body">
    <FormFieldTypeSelector v-if="indexForNewElement !== undefined" />
  </teleport> -->
</template>

<script setup lang="ts">
import { provide } from '~/compositions/injectProvide';
import { type FormFieldType, type SchemaNode } from '~/types';

const props = defineProps<{
  components: { [key: string]: FormFieldType };
  showIf?: (node: SchemaNode) => boolean;
}>();

const schema = defineModel<SchemaNode[]>('schema', { required: true });
provide('schema', schema);

const data = defineModel<FormData>('data', { required: true });
provide('data', data);

const mode = defineModel<'edit' | 'preview'>('mode', { default: 'edit' as const });
provide('mode', mode);

provide('components', props.components);
</script>
