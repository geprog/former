<template>
  <div class="flex flex-col gap-2 w-full items-start">
    <label class="p-1" v-if="label">{{ label }}</label>
    <div v-for="(item, i) in modelValue" :key="i" class="flex gap-2">
      <FormRenderer :schema="itemSchema" :data="item" @update:data="updateItem(i, $event)" />
      <Button @click.prevent="deleteItem(i)">x</Button>
    </div>
    <Button @click.prevent="addItem">Add</Button>
  </div>
</template>

<script setup lang="ts">
import FormRenderer from '~/components/FormRenderer.vue';
import type { SchemaNode } from '~/types';
import Button from './Button.vue';

defineProps<{
  label?: string;
  placeholder?: string;
  itemSchema: SchemaNode[];
}>();

const modelValue = defineModel<unknown[]>();

function updateItem(index: number, data: unknown) {
  modelValue.value?.splice(index, 1, data);
}

function addItem() {
  modelValue.value?.push({});
}

function deleteItem(index: number) {
  modelValue.value?.splice(index, 1);
}
</script>
