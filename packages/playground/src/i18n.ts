import en from '@former-ui/preset-nuxt-ui/en.json';
import { createI18n } from 'vue-i18n';

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en },
});
