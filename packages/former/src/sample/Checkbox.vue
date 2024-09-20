<template>
  <div>
    <input v-model="modelValue" type="checkbox" class="p-1 rounded">
    <label v-if="label" class="p-1">{{ label }}</label>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string;
}>();

const modelValue = defineModel<boolean>();
</script>
