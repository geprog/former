<template>
  <UCheckbox
    :id="id"
    v-model="modelValue"
    :label="label"
    :description="typeof error === 'string' ? error : undefined"
    :disabled="mode === 'read'"
  />
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import UCheckbox from '@nuxt/ui/components/Checkbox.vue';

defineProps<{
  label?: string;
} & Partial<FormerProps>>();

const modelValue = defineModel<boolean>();
</script>
