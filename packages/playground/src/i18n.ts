import en from '@former-ui/preset-nuxt-ui/en.json';
import { de as nuxtUiDe, en as nuxtUiEn } from '@nuxt/ui/locale';
import { createI18n } from 'vue-i18n';
import de from './locales/de.json';

// the locales of nuxt ui for the languages the playground has texts for
export const nuxtUiLocales: Record<string, typeof nuxtUiEn> = { en: nuxtUiEn, de: nuxtUiDe };

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, de },
});
