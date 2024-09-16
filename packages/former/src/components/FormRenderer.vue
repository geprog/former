<template>
  <div
    v-for="node in schema"
    :key="node._id"
    class="former-draggable relative"
    :class="{
      'bg-zinc-200 rounded': edit === true && showIf ? !showIf(node, nodePath.concat(node._id), data) : false,
    }"
    :data-node="node._id"
  >
    <component
      v-if="!edit && showIf ? showIf(node, nodePath.concat(node.name || []), data) : true"
      :is="edit ? EditComponent : FormComponent"
      :node
      :node-path="nodePath.concat(node.name || [])"
      :model-value="node.name ? data?.[node.name] : undefined"
      @update:model-value="(e: unknown) => setData(node.name, e)"
      @valid="validityMap[node._id] = $event"
    >
      <div class="former-drag-container relative" :data-parent-node="node._id">
        <FormRenderer
          v-if="node.children"
          :schema="node.children"
          :edit
          :node-path="nodePath.concat(node.name || [])"
          :data="node.name ? data?.[node.name] : undefined"
          @update:data="(e: unknown) => setData(node.name, e)"
          @valid="childrenValidityMap[node._id] = $event"
        />
      </div>
    </component>
  </div>
</template>

<script setup lang="ts">
import type { FormData, InternalSchemaNode, SchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';
import EditComponent from './EditComponent.vue';
import { inject } from '~/compositions/injectProvide';
import { computed, ref, toRef, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    schema?: InternalSchemaNode[];
    edit?: boolean;
    nodePath?: string[];
  }>(),
  {
    schema: undefined,
    edit: false,
    nodePath: () => [],
  },
);

const emit = defineEmits<{
  (e: 'valid', valid: boolean): void
}>();

const validityMap = ref<Record<string, boolean | undefined>>({});
const childrenValidityMap = ref<Record<string, boolean | undefined>>({});

const data = defineModel<FormData>('data', { default: () => ({}) });

const schema = toRef(props, 'schema');
const edit = toRef(props, 'edit');
const nodePath = toRef(props, 'nodePath');

const showIf = inject('showIf', false);

function isShown(node: SchemaNode) {
  if (!edit.value && showIf) {
    // only evaluate showIf when we are not editing the form
    // in edit mode we are still showing the component but highlighting it differently
    return showIf(node, nodePath.value.concat(node.name || []), data.value);
  }
  return true;
}

function setData(name: string | undefined, e: unknown) {
  if (!name) {
    // TODO: pass through the change event
    return;
  }

  const _data = { ...data.value };
  _data[name] = e;
  data.value = _data;
}

const isValid = computed(() => {
  const relevantNodes = (schema.value || []).filter((node) => isShown(node));
  return relevantNodes.every((node) => validityMap.value[node._id] !== false && childrenValidityMap.value[node._id] !== false);
});

watch(isValid, () => {
  emit('valid', isValid.value);
}, { immediate: true,  });
</script>
