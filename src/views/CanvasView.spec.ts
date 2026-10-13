import { VueQueryPlugin } from '@tanstack/vue-query'
import type { NodeDragEvent, NodeMouseEvent } from '@vue-flow/core'
import { VueFlow } from '@vue-flow/core'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { useNodeDrawer } from '@/composables/useNodeDrawer'
import { useFlowStore } from '@/stores/useFlowStore'
import { getNodeHeight, getNodeWidth } from '@/utils/flowLayout'
import CanvasView from './CanvasView.vue'
import mockFlowNodes from '../../api/_fixtures/mockFlow'

const mountOptions = { global: { plugins: [VueQueryPlugin] } }

beforeAll(() => {
  if (typeof ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
})

beforeEach(() => {
  setActivePinia(createPinia())
  useNodeDrawer().close()
})

function emitNodeClick(vueFlow: ReturnType<typeof mount<typeof VueFlow>>, data: unknown) {
  vueFlow.vm.$emit('nodeClick', { event: new MouseEvent('click'), node: { data } } as NodeMouseEvent)
}

describe('CanvasView', () => {
  it('passes the store sample data plus add-node placeholders through to VueFlow as nodes and edges', () => {
    const wrapper = mount(CanvasView, mountOptions)

    const leafCount = mockFlowNodes.filter(
      (node) => !mockFlowNodes.some((candidate) => candidate.parentId === node.id),
    ).length

    const vueFlow = wrapper.findComponent(VueFlow)
    expect(vueFlow.props('nodes')).toHaveLength(mockFlowNodes.length + leafCount)
    expect(vueFlow.props('edges')).toHaveLength(mockFlowNodes.length - 1 + leafCount)
  })

  it('opens the node drawer when an interactive node is clicked', async () => {
    const wrapper = mount(CanvasView, mountOptions)
    const vueFlow = wrapper.findComponent(VueFlow)
    const sendMessageNode = mockFlowNodes.find((node) => node.type === 'sendMessage')!

    emitNodeClick(vueFlow, sendMessageNode)
    await wrapper.vm.$nextTick()

    expect(useNodeDrawer().isOpen.value).toBe(true)
    expect(useNodeDrawer().selectedNodeId.value).toBe(sendMessageNode.id)
  })

  it('does not open the node drawer when a non-interactive node is clicked', async () => {
    const wrapper = mount(CanvasView, mountOptions)
    const vueFlow = wrapper.findComponent(VueFlow)
    const triggerNode = mockFlowNodes.find((node) => node.type === 'trigger')!

    emitNodeClick(vueFlow, triggerNode)
    await wrapper.vm.$nextTick()

    expect(useNodeDrawer().isOpen.value).toBe(false)
  })

  it('does nothing when the clicked node has no data', async () => {
    const wrapper = mount(CanvasView, mountOptions)
    const vueFlow = wrapper.findComponent(VueFlow)

    emitNodeClick(vueFlow, undefined)
    await wrapper.vm.$nextTick()

    expect(useNodeDrawer().isOpen.value).toBe(false)
  })

  it('closes the node drawer when the pane is clicked', async () => {
    useNodeDrawer().open(2)
    const wrapper = mount(CanvasView, mountOptions)
    const vueFlow = wrapper.findComponent(VueFlow)

    vueFlow.vm.$emit('paneClick', new MouseEvent('click'))
    await wrapper.vm.$nextTick()

    expect(useNodeDrawer().isOpen.value).toBe(false)
    expect(useNodeDrawer().selectedNodeId.value).toBeNull()
  })

  it('stores the dragged node center when a drag stops', async () => {
    const wrapper = mount(CanvasView, mountOptions)
    const store = useFlowStore()
    store.setNodes(mockFlowNodes)
    const node = store.nodes.find((candidate) => candidate.type === 'sendMessage')!

    wrapper.findComponent(VueFlow).vm.$emit('nodeDragStop', {
      event: new MouseEvent('mouseup'),
      node: { data: node, position: { x: 10, y: 20 } },
      nodes: [{ data: node, position: { x: 10, y: 20 } }],
      intersections: undefined,
    } as unknown as NodeDragEvent)

    expect(store.nodes.find((candidate) => candidate.id === node.id)!.position).toEqual({
      x: 10 + getNodeWidth(node) / 2,
      y: 20 + getNodeHeight(node) / 2,
    })
  })

  it('undoes and redoes with keyboard shortcuts', async () => {
    mount(CanvasView, { ...mountOptions, attachTo: document.body })
    const store = useFlowStore()
    store.setNodes(mockFlowNodes)
    const id = mockFlowNodes[1].id
    const original = { ...store.nodes[1].position! }
    store.moveNodes([{ id, position: { x: 1, y: 1 } }])

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(store.nodes[1].position).toEqual(original)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true }))
    expect(store.nodes[1].position).toEqual({ x: 1, y: 1 })
  })

  it('ignores the undo shortcut while typing in an input', async () => {
    mount(CanvasView, { ...mountOptions, attachTo: document.body })
    const store = useFlowStore()
    store.setNodes(mockFlowNodes)
    store.moveNodes([{ id: mockFlowNodes[1].id, position: { x: 1, y: 1 } }])

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))

    expect(store.nodes[1].position).toEqual({ x: 1, y: 1 })
    input.remove()
  })

  it('closes the drawer when undo removes the selected node', async () => {
    const wrapper = mount(CanvasView, mountOptions)
    const store = useFlowStore()
    store.setNodes(mockFlowNodes)
    const created = store.createNode({ name: 'New', type: 'addComment' }, { mode: 'add', parentId: 'a9b0c1' })
    useNodeDrawer().open(created.id)

    store.undo()
    await wrapper.vm.$nextTick()

    expect(useNodeDrawer().isOpen.value).toBe(false)
  })
})
