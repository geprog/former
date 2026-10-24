import { config } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import en from '../src/locales/en.json';

config.global.plugins = [createI18n({ legacy: false, locale: 'en', messages: { en } })];
