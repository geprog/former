<template>
  <UApp :locale="nuxtUiLocales[locale]">
    <div class="flex flex-col h-screen dark:bg-zinc-900 bg-gray-100 dark:text-zinc-100">
      <header class="flex items-center gap-4 px-8 py-3 border-b dark:border-zinc-700 border-gray-200 dark:bg-zinc-800 bg-white">
        <h1 class="text-2xl font-bold">
          👩🏾‍🌾 Former playground
        </h1>
        <div class="flex items-center gap-2 ml-auto">
          <ULocaleSelect v-model="locale" :locales="Object.values(nuxtUiLocales)" class="w-40" />
          <UColorModeSelect class="w-32" />
        </div>
      </header>
      <Playground class="flex-1 min-h-0" />
    </div>
  </UApp>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import { nuxtUiLocales } from './i18n';
import Playground from './Playground.vue';

const { locale } = useI18n();
</script>
