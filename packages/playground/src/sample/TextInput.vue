<template>
  <div class="flex flex-col w-full">
    <label v-if="label" :for="id" class="p-1">{{ label }}</label>
    <div class="border dark:border-zinc-400 rounded">
      <input :id="id" v-model="modelValue" :disabled="mode === 'read'" :type :placeholder class="w-full p-1 rounded dark:bg-zinc-800">
    </div>
    <div v-if="error" class="text-red-500">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FieldData, FormComponents, FormData, FormerProps, FormFieldType, Mode, SchemaNode, ShowIfPredicate, Validator } from 'former-ui';
import { onMounted, toRef } from 'vue';

const props = withDefaults(
  defineProps<{
    label?: string;
    type?: 'text' | 'password' | 'email';
    placeholder?: string;
    initialValue?: string
  } & FormerProps>(),
  {
    type: 'text',
  },
);
const mode = toRef(props, 'mode');
const initialValue = toRef(props, 'initialValue');
const modelValue = defineModel<string>();

onMounted(() => {
  if (modelValue.value === undefined && initialValue.value) {
    modelValue.value = initialValue.value;
  }
});
</script>
