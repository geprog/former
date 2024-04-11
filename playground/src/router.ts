import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('./views/Playground.vue'),
    },
    {
      path: '/test',
      children: [
        {
          path: 'basic',
          component: () => import('./views/tests/Basic.vue'),
        },
      ],
    },
  ],
});

export default router;
