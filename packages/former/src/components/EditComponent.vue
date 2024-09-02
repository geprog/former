<template>
  <div class="bg-red-500">
    <FormComponent :node v-model="modelValue">
      <slot />
    </FormComponent>
  </div>
</template>

<script setup lang="ts">
import type { FormData, SchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';

defineProps<{
  node: SchemaNode;
}>();

const modelValue = defineModel<FormData>({
  required: true,
});
</script>
