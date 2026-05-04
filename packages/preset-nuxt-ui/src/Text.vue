<template>
  <UFormField :label="label" :name="id" :error="error" :required="required">
    <UInput
      :id="id"
      v-model="modelValue"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :disabled="mode === 'read'"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import UFormField from '@nuxt/ui/components/FormField.vue';
import UInput from '@nuxt/ui/components/Input.vue';
import { onMounted, toRef } from 'vue';

const props = withDefaults(
  defineProps<{
    label?: string;
    type?: 'text' | 'password' | 'email';
    placeholder?: string;
    initialValue?: string;
    required?: boolean;
  } & FormerProps>(),
  {
    type: 'text',
  },
);

const mode = toRef(props, 'mode');
const initialValue = toRef(props, 'initialValue');
const modelValue = defineModel<string>();

onMounted(() => {
  if (modelValue.value === undefined && initialValue.value) {
    modelValue.value = initialValue.value;
  }
});
</script>
