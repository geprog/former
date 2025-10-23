<template>
  <UFormField :label="label" :description="help" :error="error" class="w-full">
    <div :class="klass">
      <FormRenderer />
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import { FormRenderer, type FormerProps } from 'former-ui';
type ClassNameValue = string | string[] | Record<string, boolean>;

const props = defineProps<{
  label?: string; help?: string;
  klass?: ClassNameValue;
} & Partial<FormerProps>>();

const { label, help, error, klass } = props;
</script>