<template>
  <UFormField
    v-if="!(mode === 'read' && !hasContent)"
    :label
    :description="help"
    class="flex w-full flex-col"
  >
    <div
      class="flex w-full gap-2 dark:border-gray-800 dark:bg-gray-900"
      :class="{ 'rounded-lg border border-[#e5e7eb] bg-white p-2 shadow-sm': border }"
    >
      <div v-for="column in columns" :key="column" class="w-full flex-grow">
        <FormRenderer :category="column" />
      </div>
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import type { FieldData, FormData, FormerProps, SchemaNode } from '@former-ui/former';
import { FormRenderer } from '@former-ui/former';
import { computed, inject, type Ref } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<
    {
      label?: string;
      help?: string;
      cols?: number | '';
      border?: boolean;
    } & FormerProps
  >(),
  // also used before the settings of a new columns node were opened, which apply the preset of `cols`
  { cols: 2 },
);

// columns are a layout component, so their model value is the data of the surrounding node
const modelValue = defineModel<FormData | null | undefined>();
const node = inject<Ref<SchemaNode> | undefined>('node', undefined);
const columns = computed(() =>
  typeof props.cols !== 'number' || props.cols < 0
    ? []
    : Array.from({ length: props.cols }, (_, index) => `column-${index}`),
);

function hasValue(value: FieldData | FormData) {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return typeof value !== 'object' || Object.keys(value).length > 0;
}

// whether any child has data, children without name (e.g. images) are always shown
function hasChildContent(children: SchemaNode['children']): boolean {
  const nodes = Array.isArray(children) ? children : Object.values(children ?? {}).flat();
  return nodes.some((child) => {
    if (child.name) {
      return hasValue(modelValue.value?.[child.name]);
    }
    return child.children ? hasChildContent(child.children) : true;
  });
}

const hasContent = computed(() => hasChildContent(node?.value.children));
</script>
