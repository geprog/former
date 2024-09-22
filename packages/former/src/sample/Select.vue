<template>
  <div class="flex flex-col">
    <label v-if="label" :for="node?._id" class="p-1">{{ label }}</label>
    <div class="border rounded">
      <select :id="node?._id" v-model="modelValue" class="w-full p-1 rounded bg-[field]">
        <option v-for="(item, i) in options" :key="i" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormerProps } from '~/types';

defineProps<{
  label?: string;
  options?: { label: string; value: string }[];
  placeholder?: string;
} & Partial<FormerProps>>();

const modelValue = defineModel<string>();
</script>
