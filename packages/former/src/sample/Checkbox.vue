<template>
  <div>
    <input :id="node?._id || fallbackNodeId" v-model="modelValue" type="checkbox" class="p-1 rounded">
    <label v-if="label" :for="node?._id || fallbackNodeId" class="p-1">{{ label }}</label>
  </div>
</template>

<script setup lang="ts">
import type { FormerProps } from '~/types';
import { nanoid } from '~/utils';

defineProps<{
  label?: string;
} & Partial<FormerProps>>();

const modelValue = defineModel<boolean>();

// for when component is used outside Former
const fallbackNodeId = nanoid();
</script>
