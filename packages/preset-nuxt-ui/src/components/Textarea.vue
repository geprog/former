<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label="label"
    :required="required"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <UTextarea
      v-bind="$attrs"
      v-model="modelValue"
      :ui="{ base: 'bg-transparent' }"
      class="w-full border border-zinc-300 dark:border-zinc-600 rounded"
      size="lg"
      :disabled="mode === 'read'"
      @blur="hasBlurred = true"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { ref, toRef } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  label?: string
  required?: boolean
  help?: string
} & FormerProps>();
const modelValue = defineModel<string>();
const hasBlurred = ref(false);

const { mode, error } = { mode: toRef(props, 'mode').value, error: toRef(props, 'error').value };
const { label, required, help } = props;
</script>
