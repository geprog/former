<template>
  <UFormField v-if="!(mode === 'read' && !modelValue)" :label :required :description="help" :error class="w-full">
    <UInput v-bind="$attrs" v-model:model-value="modelValue" type="text" size="lg" :disabled="mode === 'read'" />
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
    preset?: string;
  } & FormerProps
>();

const modelValue = defineModel<string>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);
</script>
