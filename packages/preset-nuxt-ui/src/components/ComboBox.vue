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
      v-model="selected"
      :items="items"
      by="value"
      :disabled="mode === 'read'"
      :ui="ui"
      :class="klass"
      class="w-full"
      v-bind="$attrs"
      @update:search-term="onSearchTerm"
      @blur="hasBlurred = true"
    >
      <template #empty="{ searchTerm }">
        <div v-if="!disableCustomValue">
          Create {{ searchTerm ?? '' }}
        </div>
        <div v-else>
          No results
        </div>
      </template>
    </UInputMenu>
  </UFormField>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { computed, ref, toRef } from 'vue';

type ClassNameValue = string | string[] | Record<string, boolean>;
type Opt = { label: string; value: string };

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  label?: string
  required?: boolean
  help?: string
  options?: Array<{ label?: string; value: string }>
  disableCustomValue?: boolean
  ui?: Record<string, string>
  klass?: ClassNameValue
} & Partial<FormerProps>>();

const modelValue = defineModel<string | undefined>();

const hasBlurred = ref(false);
const mode = toRef(props, 'mode');
const error = toRef(props, 'error');
const disableCustomValue = toRef(props, 'disableCustomValue');

const items = computed<Opt[]>(() =>
  (props.options ?? []).map(o => ({ label: o.label ?? o.value, value: o.value })),
);

const selected = computed<Opt | undefined>({
  get() {
    const found = items.value.find(i => i.value === modelValue.value);
    if (found)
      return found;
    if (!disableCustomValue.value && modelValue.value)
      return { label: modelValue.value, value: modelValue.value };
    return undefined;
  },
  set(item) {
    modelValue.value = item?.value;
  },
});

function onSearchTerm(term: string) {
  if (!disableCustomValue.value)
    modelValue.value = term || undefined;
}

const { label, required, help, ui, klass } = props;
</script>
