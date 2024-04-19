<template>
    <FormKitSchema :schema="schemaWithModelValue" :library :data="dataWithUpdateFunctions" />
</template>

<script setup lang="ts">
import { FormKitSchema } from '@formkit/vue';
import type { FormKitSchemaNode, FormKitLibrary } from '@formkit/core';
import { computed } from 'vue';
import { isFormKitSchemaNode } from '~/compositions/useFormKitUtils';

defineProps<{
  library: FormKitLibrary;
}>();

const data = defineModel<Record<string, any>>('data', {
  required: true,
});

const schema = defineModel<FormKitSchemaNode[]>('schema', {
  required: true,
});

function addModelValueToSchema(schema: FormKitSchemaNode[]) {
  return schema.map((node) => {
    if (isFormKitSchemaNode(node) && node.$formkit && !node.modelValue) {
      node.modelValue = `$${node.name}`;
      node['onUpdate:modelValue'] = `$update${node.name}`;
    }

    return node;
  });
}

function removeModelValueFromSchema(schema: FormKitSchemaNode[]) {
  return schema.map((node) => {
    if (isFormKitSchemaNode(node) && node.$formkit && node.modelValue) {
      delete node.modelValue;
      delete node['onUpdate:modelValue'];
    }

    return node;
  });
}

const schemaWithModelValue = computed({
    get() {
    return addModelValueToSchema(schema.value);
  },
  set(_schema) {
    schema.value = removeModelValueFromSchema(_schema);
  },
});

const dataWithUpdateFunctions = computed(() => {
  const dataWithUpdaters = { ...data.value };
  schema.value.forEach((node) => {
    if (isFormKitSchemaNode(node) && node.modelValue) {
      const id = node.modelValue.replace('$', '');
      dataWithUpdaters[`update${id}`] = (value: any) => {
        // TODO: get rid of side effects
        data.value[id] = value;
      };
    }
  });
  return dataWithUpdaters;
});
</script>
