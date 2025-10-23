<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label="label"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <URadioGroup
      v-model="modelValue"
      variant="card"
      :items="items"
      option-attribute="label"
      value-attribute="value"
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

type Opt = { label?: string; value: string };

const props = defineProps<{
  label?: string; help?: string;
  options?: Opt[];
  ui?: Record<string, string>; klass?: ClassNameValue;
} & Partial<FormerProps>>();

const modelValue = defineModel<string>();
const hasBlurred = ref(false);

const items = computed(() => (props.options ?? []).map(o => ({ label: o.label ?? o.value, value: o.value })));
const mode  = toRef(props, 'mode');
const error = toRef(props, 'error');
const { label, help, ui, klass } = props;
</script>