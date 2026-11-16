<template>
  <slot />
</template>

<script setup lang="ts">
import type { FormData } from '~/types';
import { computed, onUnmounted, ref, toRef, watch } from 'vue';
import { inject, provide } from '~/compositions/injectProvide';
import { dataScopesOfListItem, nanoid } from '~/utils';

// `index` is the position of the data in the list of the parent (e.g. a repeater) for the path of its scope
const props = defineProps<{ data: FormData; index: number }>();
const data = toRef(props, 'data');

// the data is the scope of the nodes inside of it, e.g. of the fields of a repeater item
const parentNode = inject('node', false);
const parentDataScopes = inject('dataScopes', false);
provide('dataScopes', computed(() => dataScopesOfListItem(parentNode?.value, props.data, props.index, parentDataScopes?.value ?? [])));

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
