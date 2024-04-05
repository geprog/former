<template>
  <div v-if="element && elementProps">
    <TextFieldOptions v-if="elementProps?.type === 'text'" :element />
    <FormKit type="button" label="Delete" :onClick="deleteComponent" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TextFieldOptions from './TextFieldOptions.vue';
import { inject } from '~/compositions/injectProvide';

const element = inject('selectedElement');
const schema = inject('schema');

type ElementProps = {
  id: number;
  type: string;
};

const elementProps = computed(() => {
  return (element.value as { props?: Partial<ElementProps> }).props;
});

function deleteComponent() {
  const index = schema.value.findIndex((node) => node === element.value);
  schema.value.splice(index, 1);
}
</script>
