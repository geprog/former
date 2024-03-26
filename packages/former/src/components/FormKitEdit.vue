
<template>
  <div v-if="isEdit" class="group flex flex-col handle">
    <div class="flex gap-2 group-hover:border-blue-600 border border-transparent p-2 rounded-lg bg-white">
      <div>
        <FormKit v-bind="$attrs" />
      </div>

      <div class="ml-auto gap-4 hidden group-hover:flex">
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
      </div>
    </div>

    <div class="mx-auto mt-2 hidden group-hover:flex">
      <FormKit
        type="button"
        label="Add component"
        :onClick="addAfter"
      />
    </div>
  </div>
  <FormKit v-else v-bind="$attrs" />
</template>

<script setup lang="ts">
import { FormKit } from '@formkit/vue';
import { inject, type Ref } from 'vue';

const isEdit = inject<Ref<boolean>>('isEdit');

defineProps<{ onDelete?: () => void; addAfter?: () => void; edit?: () => void }>();
</script>
