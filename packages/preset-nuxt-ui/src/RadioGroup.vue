<template>
  <UFormField v-if="!(mode === 'read' && !modelValue)" :description="help" :error>
    <URadioGroup v-bind="$attrs" v-model:model-value="modelValue" :items :legend="label" :disabled="mode === 'read'" />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import { toRef } from 'vue';

import { useOptions } from './composables/useOptions';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    help?: string;
    options?: { label?: string; value: string; presetFormula?: string }[];
  } & FormerProps
>();

const modelValue = defineModel<string>();

const options = toRef(props, 'options');

const { items } = useOptions(modelValue, options);
</script>
