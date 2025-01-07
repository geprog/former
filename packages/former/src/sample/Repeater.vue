<template>
  <div class="flex flex-col gap-2 w-full items-start dark:text-zinc-100 dark:bg-zinc-800">
    <label v-if="label" class="p-1">{{ label }}</label>
    <div v-for="(item, index) in modelValue" :key="index" class="flex gap-2 w-full dark:bg-zinc-800 dark:text-zinc-100">
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
import type { FormData, FormerProps } from '~/types';
import FormDataProvider from '~/components/FormDataProvider.vue';
import FormRenderer from '~/components/FormRenderer.vue';
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
