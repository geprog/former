<template>
  <div>
    <input type="checkbox" v-model="modelValue" class="p-1 rounded" />
    <label class="p-1" v-if="label">{{ label }}</label>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    label?: string;
  }>();

const modelValue = defineModel<boolean>();
</script>
