<template>
  <div>
    <input :id="node._id" v-model="modelValue" type="checkbox" class="p-1 rounded">
    <label v-if="label" :for="node._id" class="p-1">{{ label }}</label>
  </div>
</template>

<script setup lang="ts">
import type { FormerProps } from '~/types';

defineProps<{
  label?: string;
} & FormerProps>();

const modelValue = defineModel<boolean>();
</script>
