<template>
  <FormNode
    v-for="node in schema"
    :key="node._id"
    v-model:data="data"
    :node
    :repeated-form-identifier
  />
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import type { FormData, InternalSchemaNode } from '~/types';
import FormNode from './FormNode.vue';

const props = defineProps<{
  schema?: InternalSchemaNode[];
  repeatedFormIdentifier?: string | number;
}>();

const data = defineModel<FormData>('data', { default: () => ({}) });

const schema = toRef(props, 'schema');
</script>
