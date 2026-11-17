<template>
  <UFormField :label :required :description="help" :error class="w-full">
    <UInput
      v-model:model-value="modelValue"
      :placeholder
      :type="inputType || 'text'"
      :minlength="minLength ?? undefined"
      :maxlength="maxLength ?? undefined"
      :autocomplete="inputType === 'password' ? 'new-password' : undefined"
      size="lg"
      :disabled="mode === 'read'"
      class="w-full"
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
    placeholder?: string;
    preset?: string;
    inputType?: 'text' | 'email' | 'url' | 'tel' | 'password';
    minLength?: number | null;
    maxLength?: number | null;
  } & FormerProps
>();

const modelValue = defineModel<string | null>();
const preset = toRef(props, 'preset');

usePresetValue(modelValue, preset);
</script>
