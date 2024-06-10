<template>
  <div role="dialog" class="fixed inset-0 z-20 flex items-center justify-center bg-gray-900 bg-opacity-50">
    <div class="rounded bg-white p-8 shadow-md flex flex-col">
      <p class="mb-4 mx-auto text-xl">Select a form field</p>

      <div class="grid grid-cols-2 gap-4">
        <FormKit
          type="button"
          v-for="(formFieldType, key) in formFieldTypes"
          :key="key"
          :label="formFieldType.label"
          outer-class="!mb-0"
          input-class="flex-grow w-full text-center justify-center !mb-0"
          @click="addNewElement(key)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from '~/compositions/injectProvide';
import { formFieldTypes } from './formFieldTypes';

const generateId = () => `former-${Math.random().toString(36).substring(7)}`;

const schema = inject('schema');
const indexForNewElement = inject('indexForNewFormField');

function addNewElement(formFieldType: keyof typeof formFieldTypes) {
  if (indexForNewElement.value === undefined) {
    return;
  }

  schema.value.splice(indexForNewElement.value + 1, 0, {
    $formkit: formFieldType,
    id: generateId(),
    name: `new_${formFieldType}_field_${schema.value.length}`,
    label: `New ${formFieldType} field ${schema.value.length}`,
    help: `This is a new ${formFieldType} field.`,
  });

  indexForNewElement.value = undefined;
}
</script>
