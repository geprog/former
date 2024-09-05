<template>
  <div
    v-for="(node, i) in schema"
    :key="node._id"
    class="former-draggable relative"
    :class="{
      'bg-zinc-200 rounded': edit === true && showIf ? !showIf(node, data) : false,
    }"
    :data-node="node._id"
  >
    <component
      v-if="!edit && showIf ? showIf(node, data) : true"
      :is="edit ? EditComponent : FormComponent"
      :node
      :model-value="node.name ? data?.[node.name] : undefined"
      @update:model-value="(e: unknown) => setData(node.name, e)"
    >
      <div class="former-drag-container" :data-parent-node="node._id">
        <FormRenderer
          v-if="node.children"
          :schema="node.children"
          :edit
          :data="node.name ? data?.[node.name] : undefined"
          @update:data="(e: unknown) => setData(node.name, e)"
        />
      </div>
    </component>
  </div>
</template>

<script setup lang="ts">
import type { FormData, InternalSchemaNode } from '~/types';
import FormComponent from './FormComponent.vue';
import EditComponent from './EditComponent.vue';
import { inject } from '~/compositions/injectProvide';

defineProps<{
  schema?: InternalSchemaNode[];
  edit?: boolean;
}>();

const data = defineModel<FormData>('data', { default: () => ({}) });

const showIf = inject('showIf', false);

function setData(name: string | undefined, e: unknown) {
  if (!name) {
    // TODO: pass through the change event
    return;
  }

  const _data = { ...data.value };
  _data[name] = e;
  data.value = _data;
}
</script>
