<template>
  <UFormGroup :label="label" :help="help" :error="error" class="w-full">
    <USelect
      v-bind="$attrs"
      :id="id"
      v-model="modelValue"
      :options="uiOptions"
      :disabled="mode === 'read'"
      class="w-full"
    />
  </UFormGroup>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { computed, toRefs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{ label?: string; help?: string; options?: Opt[] } & Partial<FormerProps>>();
type Opt = { label: string; value: string };
const modelValue = defineModel<string>();
const { id, label, help, error, mode } = toRefs(props);

const uiOptions = computed(() => props.options ?? []);
</script>
