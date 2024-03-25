
<template>
  <div v-if="isEdit" class="flex gap-2 hover:border-red-600 border border-transparent p-2 rounded-lg">
    <FormKit v-bind="$attrs" />
    <FormKit
      type="button"
      label="Edit"
      :onClick="edit"
    />
    <FormKit
      type="button"
      label="Delete"
      :onClick="onDelete"

    />
    <FormKit
      type="button"
      label="Add after"
      :onClick="addAfter"
    />
  </div>
  <FormKit v-else v-bind="$attrs" />
</template>

<script setup lang="ts">
import { FormKit } from '@formkit/vue';

defineProps<{ isEdit?: boolean; onDelete?: () => void; addAfter?: () => void; edit?: () => void }>();
</script>
