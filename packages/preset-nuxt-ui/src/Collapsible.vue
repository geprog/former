<template>
  <UCollapsible v-model:open="isOpen" :unmount-on-hide="false" class="flex w-full flex-col gap-2">
    <UButton
      :label="label || t('collapsible')"
      color="neutral"
      variant="subtle"
      :trailing-icon="isOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
      block
      class="justify-between"
    />
    <template #content>
      <p v-if="help" class="text-muted pb-2 text-sm">
        {{ help }}
      </p>
      <FormRenderer />
    </template>
  </UCollapsible>
</template>

<script setup lang="ts">
import type { FormData, FormerProps } from '@former-ui/former';
import { FormRenderer } from '@former-ui/former';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    help?: string;
    defaultOpen?: boolean;
  } & FormerProps
>();

// a collapsible section is a layout component, so its model value is the data of the surrounding node
defineModel<FormData | null | undefined>();

const { t } = useI18n();

// the content is always shown in read mode, while it is collapsed in the other modes unless it is open by default,
// it stays mounted while it is collapsed, so the presets of the fields in it are applied
const isOpen = ref(props.defaultOpen || props.mode === 'read');
watch(() => [props.defaultOpen, props.mode], () => (isOpen.value = props.defaultOpen || props.mode === 'read'));
</script>
