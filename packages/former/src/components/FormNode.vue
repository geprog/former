<template>
  <div
    v-if="isShown || mode === 'build'"
    :data-node="node._id"
    draggable="true"
    class="relative flex items-center border-2 duration-0 w-full py-2 px-2 rounded"
    :class="{
      'border-blue-600': selectedNode?._id === node._id,
      'border-transparent': selectedNode?._id !== node._id,
      'bg-zinc-200 rounded': !isShown,
      'former-draggable': mode === 'build',
    }"
    @click.stop="selectedNode = node"
    @dragstart.stop="startDrag($event, node._id)"
  >
    <span v-if="mode === 'build'" class="drag-handle !cursor-move p-2">::</span>
    <FormComponent
      v-model="modelValue"
      :node
      @valid="isNodeValid = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { cloneDeep } from 'lodash';
import { computed, ref, toRef, watch } from 'vue';
import { inject, provide } from '~/compositions/injectProvide';
import type { FieldData, FormData, InternalSchemaNode } from '~/types';
import { setDragEventData } from '~/utils';
import FormComponent from './FormComponent.vue';

const props = defineProps<{
  node: InternalSchemaNode;
  repeatedFormIdentifier?: string | number;
}>();

const data = defineModel<FormData>('data', { default: () => ({}) });

const node = toRef(props, 'node');
const repeatedFormIdentifier = toRef(props, 'repeatedFormIdentifier');

const globalData = inject('data');
const showIf = inject('showIf', false);
const mode = inject('mode');
const components = inject('components');
const selectedNode = inject('selectedNode');
const formId = inject('formId');

function startDrag(e: DragEvent, nodeId: string) {
  setDragEventData(e, formId.value, 'node_id', nodeId);
}

function isNodeLayoutComponent(node: InternalSchemaNode): boolean {
  return !(components[node.type]?.propsSchema || []).some(prop => prop.name === '$name');
}

const isLayoutComponent = computed(() => isNodeLayoutComponent(node.value));

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
    return showIf(node.value, globalData.value);
  }
  return true;
});

const isNodeValid = ref(false);
const validityMap = inject('validityMap');

const childrenValidityMap = ref<Record<string, boolean | undefined>>({});
provide('validityMap', childrenValidityMap);

const areChildrenValid = computed(() => {
  return Object.values(childrenValidityMap.value).every(
    validFlag => validFlag !== false,
  );
});

const nodeIdForValidation = computed(() => {
  if (repeatedFormIdentifier.value !== undefined) {
    return `${node.value._id}.${repeatedFormIdentifier.value}`;
  }
  return node.value._id;
});

function unsetDataOfNode(node: InternalSchemaNode, data: FormData): FormData {
  if (node.name) {
    return { ...data, [node.name]: undefined };
  }
  else if (isNodeLayoutComponent(node) && node.children) {
    let children = node.children;
    if (!Array.isArray(children)) {
      children = Object.values(children).flatMap(childrenOfCategory => childrenOfCategory);
    }
    return children.reduce<FormData>((updatedData, child) => {
      return unsetDataOfNode(child, updatedData);
    }, data as FormData);
  }
  return data;
}

const isValid = computed(() => !isShown.value || (isNodeValid.value && areChildrenValid.value));

watch(isShown, () => {
  if (!isShown.value) {
    const newData = cloneDeep(data.value);
    data.value = unsetDataOfNode(node.value, newData);
    delete validityMap.value[nodeIdForValidation.value];
  }
  else {
    validityMap.value[nodeIdForValidation.value] = isValid.value;
  }
});

watch(
  isValid,
  () => {
    validityMap.value[nodeIdForValidation.value] = isValid.value;
  },
  { immediate: true },
);
</script>

<style>
/** necessary to do proper hovering in nested elements */
[data-node]:hover:not(:has([data-node]:hover)) {
  @apply bg-blue-200;
}

[data-node] *:not(input) {
  @apply cursor-pointer;
}
</style>
