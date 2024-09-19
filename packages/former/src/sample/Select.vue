<template>
  <div class="flex flex-col">
    <label class="p-1" v-if="label">{{ label }}</label>
    <div class="border rounded">
      <select v-model="modelValue" class="w-full p-1 rounded bg-[field]">
        <option v-for="(item, i) in options" :key="i">{{ item.label }}</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string;
  options?: { label: string; value: string }[];
  placeholder?: string;
}>();

const modelValue = defineModel<string>();
</script>
