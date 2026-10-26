<template>
  <slot />
</template>

<script setup lang="ts">
import type { FormData } from '~/types';
import { computed, onUnmounted, ref, toRaw, toRef, watch } from 'vue';
import { inject, provide } from '~/compositions/injectProvide';
import { nanoid } from '~/utils';

// `index` is the position of the data in the list of the parent (e.g. a repeater) for the path of its scope,
// it is searched in the list if not passed, which fails if the list contains the same item more than once
const props = defineProps<{ data: FormData; index?: number }>();
const data = toRef(props, 'data');

// the data is the scope of the nodes inside of it, e.g. of the fields of a repeater item
const parentData = inject('data', false);
const parentNode = inject('node', false);
const parentDataScopes = inject('dataScopes', false);
provide('dataScopes', computed(() => {
  let scopes = parentDataScopes?.value ?? [];
  // the list (e.g. of a repeater) is in the closest scope of the node rendering it,
  // unless the node already provides the list as a scope of its own as it isn't marked as a list (`isList`)
  let listPath = [...(scopes[0]?.path ?? []), ...(parentNode?.value.name ? [parentNode.value.name] : [])];
  if (parentNode && scopes[0]?.node === parentNode.value) {
    listPath = [...scopes[0].path];
    scopes = scopes.slice(1);
  }
  const list = parentData?.value;
  const index = props.index ?? (Array.isArray(list) ? list.findIndex(item => toRaw(item) === toRaw(props.data)) : -1);
  const path = index === -1 ? listPath : [...listPath, index];
  return [{ node: parentNode?.value, data: props.data, path }, ...scopes];
}));

provide('data', data);

const id = nanoid();
const validityMap = inject('validityMap');

const childrenValidityMap = ref<Record<string, boolean | undefined>>({});
provide('validityMap', childrenValidityMap);

const areChildrenValid = computed(() => {
  return Object.values(childrenValidityMap.value).every(
    validFlag => validFlag !== false,
  );
});

watch(
  areChildrenValid,
  () => {
    validityMap.value[id] = areChildrenValid.value;
  },
  { immediate: true },
);

onUnmounted(() => {
  delete validityMap.value[id];
});
</script>
