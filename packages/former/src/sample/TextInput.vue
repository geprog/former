<template>
  <div class="flex flex-col w-full">
    <label v-if="label" :for="node._id" class="p-1">{{ label }}</label>
    <div class="border rounded">
      <input :id="node._id" v-model="modelValue" :disabled="mode === 'read'" :type :placeholder class="w-full p-1 rounded">
    </div>
    <div v-if="error" class="text-red-500">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import type { FormerProps } from '~/types';

const props = withDefaults(
  defineProps<{
    label?: string;
    type?: 'text' | 'password' | 'email';
    placeholder?: string;
  } & FormerProps>(),
  {
    type: 'text',
  },
);
const mode = toRef(props, 'mode');
const modelValue = defineModel<string>();
</script>
