<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label="label"
    :required="required"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <UInput
      v-model="modelValue"
      class="w-full"
      :type="type || 'text'"
      :size="size"
      :disabled="mode === 'read'"
      :ui="ui"
      :class="klass"
      v-bind="$attrs"
      @blur="hasBlurred = true"
    />
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { onMounted, ref, toRef } from 'vue';

type ClassNameValue = string | string[] | Record<string, boolean>;

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  label?: string;
  required?: boolean;
  help?: string;
  preset?: string;
  type?: 'text' | 'password' | 'email';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  ui?: Record<string, string>;
  klass?: ClassNameValue;
} & Partial<FormerProps>>(), {
  size: 'lg',
});

const modelValue = defineModel<string>();
const hasBlurred = ref(false);

const mode = toRef(props, 'mode');
const error = toRef(props, 'error');
const preset = toRef(props, 'preset');

onMounted(() => {
  if (modelValue.value === undefined && preset.value !== undefined) {
    modelValue.value = preset.value;
  }
});

const { label, required, help, type, size, ui, klass } = props;
</script>
