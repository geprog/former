<template>
  <div class="flex flex-col">
    <label v-if="label" :for="id || htmlId" class="p-1">{{ label }}</label>
    <div class="border dark:border-zinc-400 rounded">
      <select :id="id || htmlId" v-model="modelValue" class="w-full p-1 rounded bg-[field] dark:bg-zinc-800">
        <option v-for="(item, i) in options" :key="i" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { genId } from '@/utils/id';
import { ref } from 'vue';

defineProps<{
  label?: string;
  options?: { label: string; value: string }[];
  placeholder?: string;
} & Partial<FormerProps>>();

const modelValue = defineModel<string>();

const htmlId = ref(genId('select'));
</script>
