<template>
  <div class="flex flex-col">
    <label v-if="label" :for="id || fallbackNodeId" class="p-1">{{ label }}</label>
    <div class="border rounded">
      <select :id="id || fallbackNodeId" v-model="modelValue" class="w-full p-1 rounded bg-[field] dark:bg-zinc-800 dark:text-zinc-100">
        <option v-for="(item, i) in options" :key="i" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormerProps } from '~/types';
import { nanoid } from '~/utils';

defineProps<{
  label?: string;
  options?: { label: string; value: string }[];
  placeholder?: string;
} & Partial<FormerProps>>();

const modelValue = defineModel<string>();

// for when component is used outside Former
const fallbackNodeId = nanoid();
</script>
