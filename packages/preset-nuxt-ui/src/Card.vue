<template>
  <UCard class="w-full">
    <template v-if="label || help" #header>
      <p v-if="label" class="font-medium text-highlighted">
        {{ label }}
      </p>
      <p v-if="help" class="text-muted text-sm">
        {{ help }}
      </p>
    </template>
    <FormRenderer />
  </UCard>
</template>

<script setup lang="ts">
import type { FormData, FormerProps } from '@former-ui/former';
import { FormRenderer } from '@former-ui/former';

defineOptions({ inheritAttrs: false });

defineProps<
  {
    label?: string;
    help?: string;
  } & FormerProps
>();

// unlike a group, a card is a layout component, so its model value is the data of the surrounding node
defineModel<FormData | null | undefined>();
</script>
