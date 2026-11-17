<template>
  <UFormField :label :description="help" class="flex w-full flex-col">
    <!-- all tabs stay mounted, so the presets of the fields in hidden tabs are applied as well -->
    <UTabs :items :default-value="items[0]?.value" :unmount-on-hide="false" :variant="variant || undefined" class="w-full">
      <template #content="{ item }">
        <FormRenderer :category="item.value" />
      </template>
    </UTabs>
  </UFormField>
</template>

<script setup lang="ts">
import type { FormData, FormerProps } from '@former-ui/former';
import type { Tab } from './tabs';
import { FormRenderer } from '@former-ui/former';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { tabCategories, tabsOf } from './tabs';

defineOptions({ inheritAttrs: false });

const props = defineProps<
  {
    label?: string;
    help?: string;
    tabs?: Tab[] | null;
    variant?: 'pill' | 'link' | null;
  } & FormerProps
>();

// tabs are a layout component, so their model value is the data of the surrounding node
defineModel<FormData | null | undefined>();

const { t } = useI18n();

const items = computed(() => {
  const categories = tabCategories(props.tabs);
  return tabsOf(props.tabs).map((tab, index) => ({
    label: tab.label || `${t('tab')} ${index + 1}`,
    value: categories[index]!,
  }));
});
</script>
