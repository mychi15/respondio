import { createRouter, createWebHistory } from 'vue-router'
import CanvasView from '@/views/CanvasView.vue'
import NodeDetailView from '@/views/NodeDetailView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'canvas', component: CanvasView },
    { path: '/node/:nodeId', name: 'node-detail', component: NodeDetailView, props: true },
  ],
})
