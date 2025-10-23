<template>
  <UFormField :label="label" :description="help" :error="error">
    <UCheckbox
      v-model="modelValue"
      :disabled="mode === 'read'"
      :ui="ui"
      :class="klass"
      v-bind="$attrs"
    >
      <span v-if="checkboxLabel">{{ checkboxLabel }}</span>
    </UCheckbox>
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
type ClassNameValue = string | string[] | Record<string, boolean>;

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  label?: string; help?: string; checkboxLabel?: string;
  ui?: Record<string, string>; klass?: ClassNameValue;
} & Partial<FormerProps>>();

const modelValue = defineModel<boolean>();
const { label, help, error, mode, ui, klass, checkboxLabel } = props;
</script>