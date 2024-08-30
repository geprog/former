<template>
  <div class="bg-red-500">
    <FormComponent :node :components v-model="modelValue">
      <slot />
    </FormComponent>
  </div>
</template>

<script setup lang="ts">
import type { DefineComponent } from 'vue';
import type { FormData, SchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';

defineProps<{
  node: SchemaNode;
  components: { [key: string]: DefineComponent };
}>();

const modelValue = defineModel<FormData>({
  required: true,
});
</script>
