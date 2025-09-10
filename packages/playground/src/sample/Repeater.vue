<template>
  <div class="flex flex-col gap-2 w-full items-start">
    <label v-if="label" class="p-1">{{ label }}</label>
    <div v-for="(item, index) in modelValue" :key="index" class="flex gap-2 w-full">
      <FormDataProvider :data="item">
        <FormRenderer />
      </FormDataProvider>
      <Button v-if="mode !== 'read'" @click.prevent="deleteItem(index)">
        x
      </Button>
    </div>
    <Button v-if="mode !== 'read'" @click.prevent="addItem">
      Add
    </Button>
  </div>
</template>

<script setup lang="ts">
import type { FieldData, FormComponents, FormData, FormerProps, FormFieldType, Mode, SchemaNode, ShowIfPredicate, Validator } from 'former-ui';
import { FormAdd, FormContent, FormDataProvider, Former, FormNodeProps, FormRenderer } from 'former-ui';
import Button from './Button.vue';

defineProps<{
  label?: string;
  placeholder?: string;
} & FormerProps>();

const modelValue = defineModel<FormData[]>({
  default: () => [],
});

function addItem() {
  if (!modelValue.value) {
    modelValue.value = [];
  }

  modelValue.value = [...modelValue.value, {}];
}

function deleteItem(index: number) {
  modelValue.value = [...modelValue.value.slice(0, index), ...modelValue.value.slice(index + 1)];
}
</script>
