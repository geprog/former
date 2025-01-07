<template>
  <div class="flex flex-col w-full dark:text-zinc-100 dark:bg-zinc-800">
    <label v-if="label" :for="id" class="p-1" dark:>{{ label }}</label>
    <div class="border rounded">
      <input :id="id" v-model="modelValue" :disabled="mode === 'read'" :type :placeholder class="w-full p-1 rounded dark:text-white dark:bg-zinc-800">
    </div>
    <div v-if="error" class="text-red-500">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormerProps } from '~/types';
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
