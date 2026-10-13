import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useFlowStore } from '@/stores/useFlowStore'
import { useCreateNodeModal } from '@/composables/useCreateNodeModal'
import CanvasToolbar from './CanvasToolbar.vue'

describe('CanvasToolbar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCreateNodeModal().close()
  })

  it('creates a root trigger node directly when the flow is empty', async () => {
    const store = useFlowStore()
    store.nodes = []

    const wrapper = mount(CanvasToolbar)
    await wrapper.find('button').trigger('click')

    expect(store.nodes).toHaveLength(1)
    expect(store.nodes[0].type).toBe('trigger')
    expect(store.nodes[0].parentId).toBe(-1)

    const { isOpen } = useCreateNodeModal()
    expect(isOpen.value).toBe(false)
  })

  it('opens the create-node modal from the toolbar when the flow already has nodes', async () => {
    const store = useFlowStore()
    const before = store.nodes.length

    const wrapper = mount(CanvasToolbar)
    await wrapper.find('button').trigger('click')

    expect(store.nodes).toHaveLength(before)

    const { isOpen, invocation } = useCreateNodeModal()
    expect(isOpen.value).toBe(true)
    expect(invocation.value).toEqual({ source: 'toolbar' })
  })
})
