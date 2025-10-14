<template>
  <UFormField
    :label="label"
    :required="required"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <UInput
      v-bind="$attrs"
      v-model="modelValue"
      :ui="{ base: 'bg-transparent' }"
      class="w-full border border-zinc-300 dark:border-zinc-600 rounded"
      type="number"
      size="lg"
      :min="min"
      :max="max"
      :step="step"
      :disabled="mode === 'read'"
      @blur="hasBlurred = true"
      @keypress="blockAlphabets"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { onMounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  label?: string
  required?: boolean
  help?: string
  min?: number
  max?: number
  step?: number
} & FormerProps>(), {
  step: 1,
});
const modelValue = defineModel<number>();
const hasBlurred = ref(false);

onMounted(() => {
  if (modelValue.value === undefined)
    modelValue.value = 0;
});

watch(modelValue, () => {
  if (typeof modelValue.value === 'string' && modelValue.value === '') {
    modelValue.value = 0;
  }
});

function blockAlphabets(e: KeyboardEvent) {
  if (!/[\d.-]/.test(e.key))
    e.preventDefault();
}

const { label, required, help, error, mode, min, max, step } = props;
</script>
