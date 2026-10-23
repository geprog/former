<template>
  <UFormField v-if="!(mode === 'read' && !modelValue)" :label :required :description="help" :error class="w-full">
    <USelect
      v-bind="$attrs"
      v-model:model-value="modelValue"
      :items
      size="lg"
      :disabled="mode === 'read'"
      class="w-full"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from '@former-ui/former';
import type { Option } from './composables/useOptions';
import { toRef } from 'vue';

import { useOptions } from './composables/useOptions';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    required?: boolean;
    help?: string;
    options?: Option[];
  } & FormerProps
>();
const modelValue = defineModel<string>();
const options = toRef(props, 'options');

const { items } = useOptions(modelValue, options);
</script>
