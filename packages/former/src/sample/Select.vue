<template>
  <select v-model="modelValue">
    <option v-for="(item, i) in options" :key="i">{{ item.label }}</option>
  </select>
</template>

<script setup lang="ts">
defineProps<{
  label?: string;
  options: { label: string; value: string }[];
  placeholder?: string;
}>();

const modelValue = defineModel<string>();
</script>
