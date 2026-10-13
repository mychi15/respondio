import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'canvas', component: () => import('@/views/CanvasView.vue') },
    {
      path: '/node/:nodeId',
      name: 'node-detail',
      component: () => import('@/views/NodeDetailView.vue'),
      props: true,
    },
  ],
})
