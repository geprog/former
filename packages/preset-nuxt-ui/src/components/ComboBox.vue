<template>
  <UFormField
    v-if="!(mode === 'read' && !modelValue)"
    :label="label"
    :required="required"
    :description="help"
    :error="hasBlurred ? error : undefined"
    class="w-full"
  >
    <UInputMenu
      v-model="modelValue"
      :items="items"
      :disabled="mode === 'read'"
      :ui="ui"
      :class="klass"
      v-bind="$attrs"
      @update:query="onQuery"
      @blur="hasBlurred = true"
    >
      <template #option-empty="{ query }">
        <div 
        v-if="!disableCustomValue">Create “{{ query }}”
        </div>

        <div 
        v-else>No results
        </div>
        
      </template>
    </UInputMenu>
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { computed, ref, toRef } from 'vue';
type ClassNameValue = string | string[] | Record<string, boolean>;

defineOptions({ inheritAttrs: false });

type Opt = { label?: string; value: string };

const props = defineProps<{
  label?: string; required?: boolean; help?: string;
  options?: Opt[]; disableCustomValue?: boolean;
  ui?: Record<string, string>; klass?: ClassNameValue;
} & Partial<FormerProps>>();

const modelValue = defineModel<string>();
const hasBlurred = ref(false);

const items = computed(() => (props.options ?? []).map(o => ({ label: o.label ?? o.value, value: o.value })));
const disableCustomValue = toRef(props, 'disableCustomValue');
const mode  = toRef(props, 'mode');
const error = toRef(props, 'error');
const { label, required, help, ui, klass } = props;

function onQuery(q: string) {
  if (!disableCustomValue.value) modelValue.value = q
}
</script>