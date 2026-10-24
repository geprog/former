import ui from '@nuxt/ui/vue-plugin';
import { createApp } from 'vue';

import App from './App.vue';
import { i18n } from './i18n';

import './index.css';

const app = createApp(App);
app.use(ui);
app.use(i18n);
app.mount('#app');
