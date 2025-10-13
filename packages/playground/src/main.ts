import ui from '@nuxt/ui/vue-plugin';
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import Playground from './Playground.vue';
import './assets/main.css';

const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: Playground }] });
const app = createApp(App);
app.use(router);
app.use(ui);
app.mount('#app');
