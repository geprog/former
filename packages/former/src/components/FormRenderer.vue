<template>
  <div
    v-for="node in schema"
    :key="node._id"
    class="relative"
    :class="{
      'bg-zinc-200 rounded': !isShown(node, true),
      'former-draggable': mode === 'build',
    }"
    :data-node="node._id"
  >
    <component
      :is="mode === 'build' ? EditComponent : FormComponent"
      v-if="isShown(node)"
      :node
      :model-value="node.name ? data?.[node.name] : undefined"
      @update:model-value="setData(node.name, $event)"
      @valid="validityMap[node._id] = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { inject } from '~/compositions/injectProvide';
import type { FieldData, FormData, InternalSchemaNode, SchemaNode } from '~/types';
import EditComponent from './EditComponent.vue';
import FormComponent from './FormComponent.vue';

const props = withDefaults(
  defineProps<{
    schema?: InternalSchemaNode[];
  }>(),
  {
    schema: undefined,
  },
);

const emit = defineEmits<{
  (e: 'valid', valid: boolean): void;
}>();

const validityMap = ref<Record<string, boolean | undefined>>({});
const childrenValidityMap = ref<Record<string, boolean | undefined>>({});

const data = defineModel<FormData>('data', { default: () => ({}) });

const schema = toRef(props, 'schema');

const showIf = inject('showIf', false);
const mode = inject('mode');

function isShown(node: SchemaNode, forHighlighting?: boolean) {
  if ((mode.value !== 'build' || forHighlighting) && showIf) {
    // only evaluate showIf when we are not editing the form
    // but in edit mode we still want to show the component but highlighted
    return showIf(node, data.value);
  }
  return true;
}

function setData(name: string | undefined, e: FieldData) {
  if (!name) {
    // TODO: pass through the change event
    return;
  }

  const _data = { ...data.value };
  _data[name] = e;
  data.value = _data;
}

const isValid = computed(() => {
  const relevantNodes = (schema.value || []).filter(node => isShown(node));
  return relevantNodes.every(
    node => validityMap.value[node._id] !== false && childrenValidityMap.value[node._id] !== false,
  );
});

watch(
  isValid,
  () => {
    emit('valid', isValid.value);
  },
  { immediate: true },
);
</script>
