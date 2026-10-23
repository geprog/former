<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label
    :required
    :description="help"
    :error
    class="w-full"
  >
    <UInputMenu
      v-bind="$attrs"
      v-model:model-value="modelValue"
      :items
      value-key="value"
      :create-item="disableCustomValue ? false : 'always'"
      size="lg"
      :disabled="mode === 'read'"
      clear
      class="w-full"
      @create="onCreate"
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
    disableCustomValue?: boolean;
  } & FormerProps
>();

const modelValue = defineModel<string>();
const options = toRef(props, 'options');

const { items } = useOptions(modelValue, options);

function onCreate(value: string) {
  const trimmed = value.trim();
  if (trimmed)
    modelValue.value = trimmed;
}
</script>
