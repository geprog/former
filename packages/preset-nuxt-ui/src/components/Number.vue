<template>
  <UFormGroup :label="label" :help="help" :error="error">
    <UInput
      v-bind="$attrs"
      :id="id"
      v-model.number="modelValue"
      type="number"
      :disabled="mode === 'read'"
      :min="min"
      :max="max"
      :step="step"
    />
  </UFormGroup>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { toRefs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{ label?: string; help?: string; min?: number; max?: number; step?: number } & Partial<FormerProps>>(),
  { step: 1 },
);
const modelValue = defineModel<number>();
const { id, label, help, error, mode, min, max, step } = toRefs(props);
</script>
