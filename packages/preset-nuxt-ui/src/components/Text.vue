<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
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
      :type="type || 'text'"
      size="lg"
      :disabled="mode === 'read'"
      @blur="hasBlurred = true"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { onMounted, ref, toRef } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  label?: string
  required?: boolean
  help?: string
  preset?: string
  type?: 'text' | 'password' | 'email'
} & FormerProps>();
const modelValue = defineModel<string>();
const hasBlurred = ref(false);

const mode = toRef(props, 'mode');
const error = toRef(props, 'error');
const preset = toRef(props, 'preset');

onMounted(() => {
  if (modelValue.value === undefined && preset.value !== undefined)
    modelValue.value = preset.value;
});

const { label, required, help, type } = props;
</script>
