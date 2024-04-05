<template>
  <div v-if="elementProps">
    <h2 class="text-lg font-bold">Text field options</h2>
    <FormKit type="text" name="name" label="Name" help="What do people call you?" v-model="elementProps.name" />
    <FormKit type="text" name="label" label="Label" help="What should the user see?" v-model="elementProps.label" />
    <FormKit type="text" name="help" label="Help" help="What should the user know?" v-model="elementProps.help" />
  </div>
</template>

<script setup lang="ts">
import type { FormKitSchemaNode } from '@formkit/core';
import { FormKit } from '@formkit/vue';
import { computed } from 'vue';

const element = defineModel<FormKitSchemaNode>('element', {
  required: true,
});

type TextFieldProps = {
  id: number;
  type: string;
  name: string;
  label: string;
  help: string;
};

const elementProps = computed(() => {
  return (element.value as { props?: TextFieldProps }).props;
});
</script>
