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
    store.nodes = [
      { id: 1, parentId: -1, type: 'trigger', data: { type: 'conversationOpened', oncePerContact: true } },
    ]
    const before = store.nodes.length

    const wrapper = mount(CanvasToolbar)
    await wrapper.find('button').trigger('click')

    expect(store.nodes).toHaveLength(before)

    const { isOpen, invocation } = useCreateNodeModal()
    expect(isOpen.value).toBe(true)
    expect(invocation.value).toEqual({ source: 'toolbar' })
  })

  it('disables undo and redo when there is no history', () => {
    const wrapper = mount(CanvasToolbar)
    expect(wrapper.get('[aria-label="Undo"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Redo"]').attributes('disabled')).toBeDefined()
  })

  it('undoes and redoes the last change from the toolbar buttons', async () => {
    const store = useFlowStore()
    store.setNodes([
      { id: 1, parentId: -1, type: 'trigger', data: { type: 'conversationOpened', oncePerContact: true } },
    ])
    store.moveNodes([{ id: 1, position: { x: 50, y: 50 } }])

    const wrapper = mount(CanvasToolbar)
    await wrapper.get('[aria-label="Undo"]').trigger('click')
    expect(store.nodes[0].position).toEqual({ x: 0, y: 0 })

    await wrapper.get('[aria-label="Redo"]').trigger('click')
    expect(store.nodes[0].position).toEqual({ x: 50, y: 50 })
  })

  it('auto-aligns every node from the toolbar', async () => {
    const store = useFlowStore()
    store.setNodes([
      { id: 1, parentId: -1, type: 'trigger', data: { type: 'conversationOpened', oncePerContact: true } },
    ])
    store.moveNodes([{ id: 1, position: { x: 50, y: 50 } }])

    const wrapper = mount(CanvasToolbar)
    const autoAlign = wrapper.findAll('button').find((button) => button.text().includes('Auto-align'))!
    await autoAlign.trigger('click')

    expect(store.nodes[0].position).toEqual({ x: 0, y: 0 })
  })
})
