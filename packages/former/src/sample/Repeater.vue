<template>
  <div class="flex flex-col gap-2 w-full items-start">
    <label class="p-1" v-if="label">{{ label }}</label>
    <div v-for="(item, key, index) in modelValue" :key="index" class="flex gap-2">
      <FormRenderer v-if="itemSchema" :schema="itemSchema" :data="item" @update:data="updateItem(index, $event)" />
      <Button @click.prevent="deleteItem(key)">x</Button>
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
  itemSchema?: SchemaNode[];
}>();

const modelValue = defineModel<unknown[]>({
  default: () => [],
});

function updateItem(index: number, data: unknown) {
  modelValue.value?.splice(index, 1, data);
  modelValue.value = [...modelValue.value];
}

function addItem() {
  if (!modelValue.value) {
    modelValue.value = [];
  }

  modelValue.value = [...modelValue.value, {}];
}

function deleteItem(index: number) {
  modelValue.value?.splice(index, 1);
  modelValue.value = [...modelValue.value];
}
</script>
