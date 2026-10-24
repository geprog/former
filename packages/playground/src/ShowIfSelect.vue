<template>
  <component :is="components.select?.component" v-bind="$attrs" v-model="value" :options />
</template>

<script setup lang="ts">
import type { FormComponents } from '@former-ui/former';
import type { Ref } from 'vue';
import { computed, inject, ref } from 'vue';
import { dataFields, playgroundSchemaKey } from './showIf';

defineOptions({ inheritAttrs: false });

// stands for "no condition" as e.g. the select of nuxt ui doesn't support empty values
const ALWAYS = '$always';

const modelValue = defineModel<string | null>();

// renders the select of the active preset, so the props form keeps its look
const components = inject<Ref<FormComponents>>('components', ref({}));
const schema = inject(playgroundSchemaKey, ref([]));

const options = computed(() => [
  { label: 'Always shown', value: ALWAYS },
  ...dataFields(schema.value, components.value),
]);

const value = computed({
  get: () => modelValue.value || ALWAYS,
  set: (newValue) => {
    modelValue.value = newValue === ALWAYS ? undefined : newValue;
  },
});
</script>
