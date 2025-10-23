<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label="label"
    :required="required"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <USelect
      v-model="modelValue"
      :items="items"
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
import { computed, ref, toRef } from 'vue';

type ClassNameValue = string | string[] | Record<string, boolean>;

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  label?: string;
  required?: boolean;
  help?: string;
  options?: Opt[];
  ui?: Record<string, string>;
  klass?: ClassNameValue;
} & Partial<FormerProps>>();

type Opt = { label?: string; value: string };

const modelValue = defineModel<string>();
const hasBlurred = ref(false);

const items = computed(() => (props.options ?? []).map(o => ({ label: o.label ?? o.value, value: o.value })));
const mode = toRef(props, 'mode');
const error = toRef(props, 'error');
const { label, required, help, ui, klass } = props;
</script>
