<template>
  <UFormGroup :label="label" :help="help" :error="error">
    <UCheckbox
      v-bind="$attrs"
      :id="id"
      v-model="modelValue"
      :disabled="mode === 'read'"
    >
      <span v-if="checkboxLabel">{{ checkboxLabel }}</span>
    </UCheckbox>
  </UFormGroup>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { toRefs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ label?: string; help?: string; checkboxLabel?: string } & Partial<FormerProps>>();
const modelValue = defineModel<any>();
const { id, label, help, error, mode, checkboxLabel } = toRefs(props);
</script>
