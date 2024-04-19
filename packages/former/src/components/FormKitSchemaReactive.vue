<template>
  <FormKitSchema :schema="schemaWithModelValue" :library :data="dataWithUpdateFunctions" />
</template>

<script setup lang="ts">
import { FormKitSchema, type FormKitComponentLibrary } from '@formkit/vue';
import { isSugar, type FormKitSchemaNode } from '@formkit/core';
import { computed } from 'vue';
import { isFormKitSchemaNode } from '~/compositions/useFormKitUtils';

defineProps<{
  library?: FormKitComponentLibrary;
}>();

const data = defineModel<Record<string, any>>('data', {
  required: true,
});

const schema = defineModel<FormKitSchemaNode[]>('schema', {
  required: true,
});

function addModelValueToSchema(schema: FormKitSchemaNode[]) {
  // TODO: support nested elements
  return schema.map((node) => {
    if (isFormKitSchemaNode(node)) {
      if (isSugar(node) && !node.modelValue) {
        node.modelValue = `$${node.name}`;
        node['onUpdate:modelValue'] = `$update${node.name}`;
      } else if (node.props && !node.props.modelValue) {
        node.props.modelValue = `$${node.props.name}`;
        node.props['onUpdate:modelValue'] = `$update${node.props.name}`;
      }
    }

    return node;
  });
}

function removeModelValueFromSchema(schema: FormKitSchemaNode[]) {
  // TODO: support nested elements
  return schema.map((node) => {
    if (isFormKitSchemaNode(node)) {
      if (isSugar(node) && node.modelValue) {
        delete node.modelValue;
        delete node['onUpdate:modelValue'];
      } else if (node.props && node.props.modelValue) {
        delete node.props.modelValue;
        delete node.props['onUpdate:modelValue'];
      }
    }

    return node;
  });
}

const schemaWithModelValue = computed({
  get() {
    // TODO: clone with something better
    return addModelValueToSchema(JSON.parse(JSON.stringify(schema.value)));
  },
  set(_schema) {
    schema.value = removeModelValueFromSchema(_schema);
  },
});

const dataWithUpdateFunctions = computed(() => {
  const dataWithUpdaters = { ...data.value };
  // TODO: support nested elements
  schema.value.forEach((node) => {
    if (isFormKitSchemaNode(node)) {
      if (isSugar(node)) {
        dataWithUpdaters[`update${node.name}`] = (value: unknown) => {
          data.value = { ...data.value, [node.name]: value };
        };
      } else if (node.props) {
        dataWithUpdaters[`update${node.props.name}`] = (value: unknown) => {
          data.value = { ...data.value, [node.props!.name]: value };
        };
      }
    }
  });
  return dataWithUpdaters;
});
</script>
