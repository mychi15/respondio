import { createRouter, createWebHistory } from 'vue-router'

// Both routes render the same view, so moving between them keeps the canvas
// mounted; /node/:nodeId just opens the details drawer for that node.
const CanvasView = () => import('@/views/CanvasView.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'canvas', component: CanvasView },
    { path: '/node/:nodeId', name: 'node-detail', component: CanvasView },
  ],
})
