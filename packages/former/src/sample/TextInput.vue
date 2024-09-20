<template>
  <div class="flex flex-col w-full">
    <label v-if="label" class="p-1">{{ label }}</label>
    <div class="border rounded">
      <input v-model="modelValue" :disabled="mode === 'read'" :type :placeholder class="w-full p-1 rounded">
    </div>
    <div v-if="error" class="text-red-500">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import type { Mode } from '~/types';

const props = withDefaults(
  defineProps<{
    label?: string;
    type?: 'text' | 'password' | 'email';
    placeholder?: string;
    error?: string;
    mode?: Mode;
  }>(),
  {
    type: 'text',
    mode: 'edit',
  },
);
const mode = toRef(props, 'mode');
const modelValue = defineModel<string>();
</script>
