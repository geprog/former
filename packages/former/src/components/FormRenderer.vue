<template>
  <div
    v-for="node in schema"
    :key="node._id"
    class="relative"
    :class="{
      'bg-zinc-200 rounded': !isShown(node, true),
      'former-draggable': mode ==='builder',
    }"
    :data-node="node._id"
  >
    <component
      v-if="isShown(node)"
      :is="mode === 'builder' ? EditComponent : FormComponent"
      :node
      :mode
      :node-path="nodePath.concat(node.name || [])"
      :model-value="node.name ? data?.[node.name] : undefined"
      @update:model-value="(e: unknown) => setData(node.name, e)"
      @valid="validityMap[node._id] = $event"
    >
      <div class="relative" :class="{ 'former-drag-container': mode }" :data-parent-node="node._id">
        <FormRenderer
          v-if="node.children"
          :schema="node.children"
          :mode
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
import type { FormData, InternalSchemaNode, Mode, SchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';
import EditComponent from './EditComponent.vue';
import { inject } from '~/compositions/injectProvide';
import { computed, ref, toRef, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    schema?: InternalSchemaNode[];
    mode?: Mode;
    nodePath?: string[];
  }>(),
  {
    schema: undefined,
    mode: 'edit',
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
const mode = toRef(props, 'mode');
const nodePath = toRef(props, 'nodePath');

const showIf = inject('showIf', false);

function isShown(node: SchemaNode, forHighlighting?: boolean) {
  if ((mode.value === 'edit' || mode.value === 'reader' )&& forHighlighting && showIf) {
    // only evaluate showIf when we are not editing the form
    // but in edit mode we still want to show the component but highlighted
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
