import { VueQueryPlugin } from '@tanstack/vue-query'
import type { NodeMouseEvent } from '@vue-flow/core'
import { VueFlow } from '@vue-flow/core'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { sampleFlowNodes } from '@/stores/sampleFlow'
import { useNodeDrawer } from '@/composables/useNodeDrawer'
import CanvasView from './CanvasView.vue'

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

    const leafCount = sampleFlowNodes.filter(
      (node) => !sampleFlowNodes.some((candidate) => candidate.parentId === node.id),
    ).length

    const vueFlow = wrapper.findComponent(VueFlow)
    expect(vueFlow.props('nodes')).toHaveLength(sampleFlowNodes.length + leafCount)
    expect(vueFlow.props('edges')).toHaveLength(sampleFlowNodes.length - 1 + leafCount)
  })

  it('opens the node drawer when an interactive node is clicked', async () => {
    const wrapper = mount(CanvasView, mountOptions)
    const vueFlow = wrapper.findComponent(VueFlow)
    const sendMessageNode = sampleFlowNodes.find((node) => node.type === 'sendMessage')!

    emitNodeClick(vueFlow, sendMessageNode)
    await wrapper.vm.$nextTick()

    expect(useNodeDrawer().isOpen.value).toBe(true)
    expect(useNodeDrawer().selectedNodeId.value).toBe(sendMessageNode.id)
  })

  it('does not open the node drawer when a non-interactive node is clicked', async () => {
    const wrapper = mount(CanvasView, mountOptions)
    const vueFlow = wrapper.findComponent(VueFlow)
    const triggerNode = sampleFlowNodes.find((node) => node.type === 'trigger')!

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
})
