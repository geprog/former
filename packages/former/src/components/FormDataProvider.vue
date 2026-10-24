<template>
  <slot />
</template>

<script setup lang="ts">
import type { FormData } from '~/types';
import { computed, onUnmounted, ref, toRaw, toRef, watch } from 'vue';
import { inject, provide } from '~/compositions/injectProvide';
import { nanoid } from '~/utils';

// `index` is the position of the data in the list of the parent (e.g. a repeater), found by itself if not passed
const props = defineProps<{ data: FormData; index?: number }>();
const data = toRef(props, 'data');

const parentData = inject('data', false);
const parentDataPath = inject('dataPath', false);
provide('dataPath', computed(() => {
  const path = parentDataPath?.value ?? [];
  const list = parentData?.value;
  const index = props.index ?? (Array.isArray(list) ? list.findIndex(item => toRaw(item) === toRaw(props.data)) : -1);
  return index === -1 ? path : [...path, index];
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
