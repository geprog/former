<template>
  <UFormGroup :label="label" :help="help" :error="error" class="w-full">
    <UInput
      v-bind="$attrs"
      :id="id"
      v-model="modelValue"
      :type="type"
      :disabled="mode === 'read'"
    />
  </UFormGroup>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { toRefs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{ label?: string; help?: string; type?: 'text' | 'password' | 'email'; initialValue?: string } & Partial<FormerProps>>(),
  { type: 'text' },
);
const modelValue = defineModel<string>();
const { id, label, help, error, mode, type } = toRefs(props);
</script>
