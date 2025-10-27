<template>
  <UFormField
    v-if="!(mode === 'read' && modelValue === undefined)"
    :label="label"
    :required="required"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <UInput
      v-model.number="modelValue"
      class="w-full"
      type="number"
      :min="min"
      :max="max"
      :step="step"
      :disabled="mode === 'read'"
      :ui="ui"
      :class="klass"
      v-bind="$attrs"
      @blur="hasBlurred = true"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { ref, toRef } from 'vue';

type ClassNameValue = string | string[] | Record<string, boolean>;

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  label?: string;
  required?: boolean;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  ui?: Record<string, string>;
  klass?: ClassNameValue;
} & Partial<FormerProps>>(), { step: 1 });

const modelValue = defineModel<number>();
const hasBlurred = ref(false);

const mode = toRef(props, 'mode');
const error = toRef(props, 'error');
const { label, required, help, min, max, step, ui, klass } = props;
</script>
