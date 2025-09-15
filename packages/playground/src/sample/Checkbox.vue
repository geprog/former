<template>
  <div>
    <input :id="id || htmlId" v-model="modelValue" type="checkbox" class="p-1 rounded">
    <label v-if="label" :for="id || htmlId" class="p-1">{{ label }}</label>
  </div>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { genId } from '@/utils/id';
import { ref } from 'vue';

defineProps<{
  label?: string;
} & Partial<FormerProps>>();

const modelValue = defineModel<boolean>();

const htmlId = ref(genId('select'));
</script>
