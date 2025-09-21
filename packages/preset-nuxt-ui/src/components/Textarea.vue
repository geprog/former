<template>
  <UFormGroup :label="label" :help="help" :error="error" class="w-full">
    <UTextarea
      v-bind="$attrs"
      :id="id"
      v-model="modelValue"
      :rows="rows"
      :autoresize="autoresize"
      :disabled="mode === 'read'"
    />
  </UFormGroup>
</template>

<script setup lang="ts">
import type { FormerProps } from 'former-ui';
import { toRefs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{ label?: string; help?: string; rows?: number; autoresize?: boolean } & Partial<FormerProps>>(),
  { rows: 3, autoresize: false },
);
const modelValue = defineModel<any>();
const { id, label, help, error, mode, rows, autoresize } = toRefs(props);
</script>
