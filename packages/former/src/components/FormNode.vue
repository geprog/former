<template>
  <div
    v-if="isShown || mode === 'build'"
    class="relative"
    :class="{
      'bg-zinc-200 rounded': !isShown,
      'former-draggable': mode === 'build',
    }"
    :data-node="node._id"
  >
    <component
      :is="mode === 'build' ? EditComponent : FormComponent"
      v-model="modelValue"
      :node
      @valid="isValid = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue';
import { inject } from '~/compositions/injectProvide';
import type { FieldData, FormData, InternalSchemaNode } from '~/types';
import EditComponent from './EditComponent.vue';
import FormComponent from './FormComponent.vue';

const props = defineProps<{
  node: InternalSchemaNode;
  repeatedFormIdentifier?: string | number;
}>();

const data = defineModel<FormData>('data', { default: () => ({}) });

const node = toRef(props, 'node');
const repeatedFormIdentifier = toRef(props, 'repeatedFormIdentifier');

const showIf = inject('showIf', false);
const mode = inject('mode');
const components = inject('components');

const isLayoutComponent = computed(() => !(components[node.value.type]?.propsSchema || []).some(prop => prop.name === '$name'));

const modelValue = computed({
  get() {
    if (node.value.name) {
      return data.value?.[node.value.name];
    }
    if (isLayoutComponent.value) {
      return data.value;
    }
    return undefined;
  },
  set(newData: FieldData | FormData) {
    if (isLayoutComponent.value) {
      data.value = newData as FormData;
      return;
    }

    if (node.value.name) {
      const updatedData = { ...data.value };
      updatedData[node.value.name] = newData as FieldData;
      data.value = updatedData;
    }
  },
});

const isShown = computed(() => {
  if (showIf) {
    // only evaluate showIf when we are not building up the form
    // but in edit mode we still want to show the component but highlighted
    return showIf(node.value, data.value);
  }
  return true;
});

const isValid = ref(false);
const validityMap = inject('validityMap');

const nodeIdForValidation = computed(() => {
  if (repeatedFormIdentifier.value !== undefined) {
    return `${node.value._id}.${repeatedFormIdentifier.value}`;
  }
  return node.value._id;
});

onBeforeUnmount(() => {
  delete validityMap.value[nodeIdForValidation.value];
});

watch(isShown, (value, oldValue) => {
  if (oldValue && !value) {
    modelValue.value = undefined;
  }
});

watch(
  isValid,
  () => {
    // emit('valid', !isShown.value || isValid.value);
    validityMap.value[nodeIdForValidation.value] = !isShown.value || isValid.value;
  },
  { immediate: true },
);
</script>
