<template>
  <UFormGroup :label="label" :help="help" :error="error" class="w-full">
    <UInputMenu
      v-bind="$attrs"
      :id="id"
      v-model="modelValue"
      :items="items"
      :disabled="mode === 'read'"
      by="value"
      :searchable="true"
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
const modelValue = defineModel<any>();
const { id, label, help, error, mode } = toRefs(props);

const items = computed(() => props.options ?? []);
</script>
