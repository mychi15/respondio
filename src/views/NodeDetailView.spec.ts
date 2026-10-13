import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import NodeDetailsPanel from '@/components/nodes/NodeDetailsPanel.vue'
import NodeDetailView from './NodeDetailView.vue'

async function mountAt(nodeId: string | number) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'canvas', component: { template: '<div>canvas</div>' } },
      { path: '/node/:nodeId', name: 'node-detail', component: NodeDetailView, props: true },
    ],
  })
  await router.push(`/node/${nodeId}`)
  return { router, wrapper: mount(NodeDetailView, { global: { plugins: [router] } }) }
}

describe('NodeDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the NodeDetailsPanel for the route param node id', async () => {
    const { wrapper } = await mountAt(2)

    expect(wrapper.findComponent(NodeDetailsPanel).props('nodeId')).toBe('2')
    expect(wrapper.find<HTMLInputElement>('#node-details-name').element.value).toBe('Welcome message')
  })

  it('shows a not-found state for an unknown node id', async () => {
    const { wrapper } = await mountAt('does-not-exist')

    expect(wrapper.text()).toContain('Node not found')
  })

  it('navigates back to the canvas route after the panel reports a delete', async () => {
    const { router, wrapper } = await mountAt(6)

    wrapper.findComponent(NodeDetailsPanel).vm.$emit('deleted')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })
})
