<template>
  <UFormField :label="label" :name="id" :error="error">
    <USelect
      :id="id"
      v-model="modelValue"
      :items="options ?? []"
      value-key="value"
      label-key="label"
      :placeholder="placeholder"
      :disabled="mode === 'read'"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import UFormField from '@nuxt/ui/components/FormField.vue';
import USelect from '@nuxt/ui/components/Select.vue';

defineProps<{
  label?: string;
  options?: { label: string; value: string }[];
  placeholder?: string;
} & Partial<FormerProps>>();

const modelValue = defineModel<string>();
</script>
