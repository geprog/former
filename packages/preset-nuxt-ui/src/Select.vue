<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <USelect
      v-model:model-value="modelValue"
      :placeholder
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
    placeholder?: string;
    options?: Option[];
  } & FormerProps
>();
const modelValue = defineModel<string | null>();
const options = toRef(props, 'options');

const { items } = useOptions(modelValue, options);
</script>
