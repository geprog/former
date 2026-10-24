<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <UInput v-model:model-value="modelValue" :placeholder type="text" size="lg" :disabled="mode === 'read'" />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { usePresetValue } from '@former-ui/former';
import { toRef } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    placeholder?: string;
    preset?: string;
  } & FormerProps
>();

const modelValue = defineModel<string | null>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);
</script>
