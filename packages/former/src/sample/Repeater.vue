<template>
  <div class="flex flex-col gap-2 w-full items-start">
    <label v-if="label" class="p-1">{{ label }}</label>
    <div v-for="(item, index) in modelValue" :key="index" class="flex gap-2 w-full">
      <FormDragContainer :node>
        <FormRenderer :schema="node.children" :data="item" :repeated-form-identifier="index" @update:data="updateItem(index, $event)" />
      </FormDragContainer>
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
import FormDragContainer from '~/components/FormDragContainer.vue';
import FormRenderer from '~/components/FormRenderer.vue';
import type { FormData, FormerProps } from '~/types';
import Button from './Button.vue';

defineProps<{
  label?: string;
  placeholder?: string;
} & FormerProps>();

const modelValue = defineModel<FormData[]>({
  default: () => [],
});

function updateItem(index: number, data: FormData) {
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
