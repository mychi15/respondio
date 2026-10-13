import { VueQueryPlugin } from '@tanstack/vue-query'
import type { NodeDragEvent, NodeMouseEvent } from '@vue-flow/core'
import { VueFlow } from '@vue-flow/core'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCreateNodeModal } from '@/composables/useCreateNodeModal'
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
  it('passes the store sample data plus add-node placeholders through to VueFlow as nodes and edges', async () => {
    const wrapper = mount(CanvasView, mountOptions)
    useFlowStore().setNodes(mockFlowNodes)
    await wrapper.vm.$nextTick()

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

  async function mountWithRenderedNodes() {
    const wrapper = mount(CanvasView, { ...mountOptions, attachTo: document.body })
    useFlowStore().setNodes(mockFlowNodes)
    await flushPromises()
    return wrapper
  }

  function findNodeElement(wrapper: ReturnType<typeof mount>, id: string | number) {
    return wrapper.find<HTMLElement>(`.vue-flow__node[data-id="${id}"]`)
  }

  it('opens the drawer and focuses its heading when Enter is pressed on a focused node', async () => {
    const wrapper = await mountWithRenderedNodes()
    const sendMessageNode = mockFlowNodes.find((node) => node.type === 'sendMessage')!

    await findNodeElement(wrapper, sendMessageNode.id).trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(useNodeDrawer().selectedNodeId.value).toBe(sendMessageNode.id)
    expect(document.activeElement?.tagName).toBe('H2')
    wrapper.unmount()
  })

  it('opens the drawer when Space is pressed on a focused node', async () => {
    const wrapper = await mountWithRenderedNodes()
    const commentNode = mockFlowNodes.find((node) => node.type === 'addComment')!

    await findNodeElement(wrapper, commentNode.id).trigger('keydown', { key: ' ' })

    expect(useNodeDrawer().selectedNodeId.value).toBe(commentNode.id)
    wrapper.unmount()
  })

  it('does not open the drawer from the keyboard for a non-interactive node', async () => {
    const wrapper = await mountWithRenderedNodes()
    const triggerNode = mockFlowNodes.find((node) => node.type === 'trigger')!

    await findNodeElement(wrapper, triggerNode.id).trigger('keydown', { key: 'Enter' })

    expect(useNodeDrawer().isOpen.value).toBe(false)
    wrapper.unmount()
  })

  it('closes the drawer on Escape and returns focus to the node that opened it', async () => {
    const wrapper = await mountWithRenderedNodes()
    const sendMessageNode = mockFlowNodes.find((node) => node.type === 'sendMessage')!
    const nodeElement = findNodeElement(wrapper, sendMessageNode.id)

    await nodeElement.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await wrapper.find('aside').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(useNodeDrawer().isOpen.value).toBe(false)
    expect(document.activeElement).toBe(nodeElement.element)
    wrapper.unmount()
  })

  it('closes the drawer when Escape is pressed on a node', async () => {
    const wrapper = await mountWithRenderedNodes()
    const sendMessageNode = mockFlowNodes.find((node) => node.type === 'sendMessage')!
    useNodeDrawer().open(sendMessageNode.id)

    await findNodeElement(wrapper, sendMessageNode.id).trigger('keydown', { key: 'Escape' })

    expect(useNodeDrawer().isOpen.value).toBe(false)
    wrapper.unmount()
  })

  it('persists keyboard node moves on arrow keyup', async () => {
    const wrapper = await mountWithRenderedNodes()
    const store = useFlowStore()
    const sendMessageNode = store.nodes.find((node) => node.type === 'sendMessage')!
    const original = { ...sendMessageNode.position! }
    const nodeElement = findNodeElement(wrapper, sendMessageNode.id)

    await nodeElement.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await nodeElement.trigger('keydown', { key: 'ArrowRight' })
    await nodeElement.trigger('keyup', { key: 'ArrowRight' })

    expect(store.nodes.find((node) => node.id === sendMessageNode.id)!.position).toEqual({ x: original.x + 5, y: original.y })
    wrapper.unmount()
  })

  function stubRect(element: Element, rect: { left: number; top: number; width: number; height: number }) {
    element.getBoundingClientRect = () =>
      ({ ...rect, x: rect.left, y: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height, toJSON() {} }) as DOMRect
  }

  function getTransform(wrapper: ReturnType<typeof mount>) {
    return wrapper.find<HTMLElement>('.vue-flow__transformationpane').element.style.transform
  }

  it('pans the viewport to a focused node outside the visible area', async () => {
    const wrapper = await mountWithRenderedNodes()
    const sendMessageNode = mockFlowNodes.find((node) => node.type === 'sendMessage')!
    const nodeElement = findNodeElement(wrapper, sendMessageNode.id).element
    stubRect(wrapper.find('.vue-flow').element.parentElement!, { left: 0, top: 0, width: 800, height: 600 })
    stubRect(nodeElement, { left: 1200, top: 900, width: 280, height: 100 })
    const before = getTransform(wrapper)

    nodeElement.focus()

    await vi.waitFor(() => expect(getTransform(wrapper)).not.toBe(before))
    wrapper.unmount()
  })

  it('does not pan when a partly off-screen node is focused by a pointer press', async () => {
    const wrapper = await mountWithRenderedNodes()
    const sendMessageNode = mockFlowNodes.find((node) => node.type === 'sendMessage')!
    const nodeElement = findNodeElement(wrapper, sendMessageNode.id).element
    stubRect(wrapper.find('.vue-flow').element.parentElement!, { left: 0, top: 0, width: 800, height: 600 })
    stubRect(nodeElement, { left: 700, top: 100, width: 280, height: 100 })
    const before = getTransform(wrapper)

    nodeElement.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    nodeElement.focus()
    await new Promise((resolve) => setTimeout(resolve, 300))

    expect(getTransform(wrapper)).toBe(before)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    nodeElement.blur()
    nodeElement.focus()
    await vi.waitFor(() => expect(getTransform(wrapper)).not.toBe(before))
    wrapper.unmount()
  })

  it('opens the drawer and then pans to a partly off-screen node clicked with the mouse', async () => {
    const wrapper = await mountWithRenderedNodes()
    const [first, second] = mockFlowNodes.filter((node) => node.type === 'sendMessage' || node.type === 'addComment')
    useNodeDrawer().open(first.id)
    await flushPromises()
    const nodeElement = findNodeElement(wrapper, second.id).element
    stubRect(wrapper.find('.vue-flow').element.parentElement!, { left: 0, top: 0, width: 800, height: 600 })
    stubRect(nodeElement, { left: 700, top: 100, width: 280, height: 100 })
    const before = getTransform(wrapper)

    nodeElement.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    nodeElement.click()

    expect(useNodeDrawer().selectedNodeId.value).toBe(second.id)
    await vi.waitFor(() => expect(getTransform(wrapper)).not.toBe(before))
    wrapper.unmount()
  })

  it('does not pan when the focused node is already visible', async () => {
    const wrapper = await mountWithRenderedNodes()
    const sendMessageNode = mockFlowNodes.find((node) => node.type === 'sendMessage')!
    const nodeElement = findNodeElement(wrapper, sendMessageNode.id).element
    stubRect(wrapper.find('.vue-flow').element.parentElement!, { left: 0, top: 0, width: 800, height: 600 })
    stubRect(nodeElement, { left: 100, top: 100, width: 280, height: 100 })
    const before = getTransform(wrapper)

    nodeElement.focus()
    await new Promise((resolve) => setTimeout(resolve, 300))

    expect(getTransform(wrapper)).toBe(before)
    wrapper.unmount()
  })

  it('pans the viewport to a newly created node that lands off-screen', async () => {
    const wrapper = await mountWithRenderedNodes()
    const store = useFlowStore()
    const parent = store.nodes.find((node) => node.type === 'addComment')!
    const created = store.createNode({ name: 'New', type: 'sendMessage' }, { mode: 'add', parentId: parent.id })
    const containerRect = { left: 0, top: 0, width: 800, height: 600 }
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const offScreen = this instanceof HTMLElement && this.dataset.id === String(created.id)
      const rect = offScreen ? { left: 1200, top: 900, width: 280, height: 100 } : containerRect
      return { ...rect, x: rect.left, y: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height, toJSON() {} } as DOMRect
    })
    const before = getTransform(wrapper)

    useCreateNodeModal().markCreated(created.id)

    await vi.waitFor(() => expect(getTransform(wrapper)).not.toBe(before))
    vi.restoreAllMocks()
    wrapper.unmount()
  })

  describe('on a narrow viewport', () => {
    const initialWidth = window.innerWidth

    beforeEach(() => {
      window.innerWidth = 375
      window.dispatchEvent(new Event('resize'))
    })

    afterEach(() => {
      window.innerWidth = initialWidth
      window.dispatchEvent(new Event('resize'))
    })

    it('makes the canvas inert and focuses the full-screen drawer when a node is clicked', async () => {
      const wrapper = await mountWithRenderedNodes()
      const sendMessageNode = mockFlowNodes.find((node) => node.type === 'sendMessage')!
      const canvas = wrapper.find('[inert]')
      expect(canvas.exists()).toBe(false)

      findNodeElement(wrapper, sendMessageNode.id).element.click()
      await flushPromises()

      expect(wrapper.find('.vue-flow').element.closest('[inert]')).not.toBeNull()
      expect(wrapper.find('aside').attributes()).toMatchObject({ role: 'dialog', 'aria-modal': 'true' })
      expect(document.activeElement?.tagName).toBe('H2')
      wrapper.unmount()
    })

    it('restores the canvas and returns focus to the node when the drawer closes', async () => {
      const wrapper = await mountWithRenderedNodes()
      const sendMessageNode = mockFlowNodes.find((node) => node.type === 'sendMessage')!
      const nodeElement = findNodeElement(wrapper, sendMessageNode.id).element

      nodeElement.click()
      await flushPromises()
      await wrapper.find('aside').trigger('keydown', { key: 'Escape' })
      await flushPromises()

      expect(wrapper.find('.vue-flow').element.closest('[inert]')).toBeNull()
      expect(document.activeElement).toBe(nodeElement)
      wrapper.unmount()
    })
  })

  it('disables Vue Flow\'s Backspace delete so nodes are only removed through the store', () => {
    const wrapper = mount(CanvasView, mountOptions)

    expect(wrapper.findComponent(VueFlow).props('deleteKeyCode')).toBeNull()
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
