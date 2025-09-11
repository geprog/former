<template>
  <div>
    <input :id="id || fallbackNodeId" v-model="modelValue" type="checkbox" class="p-1 rounded">
    <label v-if="label" :for="id || fallbackNodeId" class="p-1">{{ label }}</label>
  </div>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { nanoid } from 'former-ui';

defineProps<{
  label?: string;
} & Partial<FormerProps>>();

const modelValue = defineModel<boolean>();

// for when component is used outside Former
const fallbackNodeId = nanoid();
</script>
