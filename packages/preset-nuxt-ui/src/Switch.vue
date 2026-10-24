<template>
  <UFormField v-if="!(mode === 'read' && !modelValue)" :error>
    <USwitch
      v-model:model-value="modelValue"
      :label
      :required
      :disabled="mode === 'read'"
      :description="help"
    />
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
    preset?: boolean;
  } & FormerProps
>();

const modelValue = defineModel<boolean | null>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);
</script>
