import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FlowNode } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import { DRAWER_DEFAULT_WIDTH, useNodeDrawer } from '@/composables/useNodeDrawer'
import NodeDrawer from './NodeDrawer.vue'

const sendMessageNode: FlowNode = {
  id: 2,
  parentId: 1,
  type: 'sendMessage',
  name: 'Welcome message',
  data: { payload: [] },
}

function mountDrawer() {
  return mount(NodeDrawer, { attachTo: document.body })
}

function dispatchWindowMouseEvent(type: string, clientX: number) {
  window.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }))
}

describe('NodeDrawer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useFlowStore()
    store.nodes = [sendMessageNode]

    const drawer = useNodeDrawer()
    drawer.close()
    drawer.setWidth(DRAWER_DEFAULT_WIDTH)
    drawer.setResizing(false)
  })

  it('renders nothing when no node is selected', () => {
    const wrapper = mountDrawer()

    expect(wrapper.find('aside').exists()).toBe(false)
  })

  it('renders the node title and an open-in-new-tab link when a node is selected', () => {
    useNodeDrawer().open(2)
    const wrapper = mountDrawer()

    expect(wrapper.find('aside').exists()).toBe(true)
    expect(wrapper.text()).toContain('Send Message')
    expect(wrapper.find('a').attributes('href')).toBe('/node/2')
  })

  it('focuses and labels the drawer by its heading when opened with focus requested', async () => {
    const wrapper = mountDrawer()
    useNodeDrawer().open(2, { focus: true })
    await flushPromises()

    const heading = wrapper.find('h2')
    expect(document.activeElement).toBe(heading.element)
    expect(wrapper.find('aside').attributes('aria-labelledby')).toBe(heading.attributes('id'))
    wrapper.unmount()
  })

  it('closes the drawer on Escape', async () => {
    useNodeDrawer().open(2)
    const wrapper = mountDrawer()

    await wrapper.find('aside').trigger('keydown', { key: 'Escape' })

    expect(useNodeDrawer().isOpen.value).toBe(false)
    wrapper.unmount()
  })

  it('closes the drawer when the close button is clicked', async () => {
    useNodeDrawer().open(2)
    const wrapper = mountDrawer()

    const closeButton = wrapper.findAll('button').find((button) => button.find('.sr-only').text() === 'Close')
    await closeButton!.trigger('click')

    expect(useNodeDrawer().isOpen.value).toBe(false)
    expect(useNodeDrawer().selectedNodeId.value).toBeNull()
  })

  it('closes the drawer once the node is deleted', async () => {
    useNodeDrawer().open(2)
    const wrapper = mountDrawer()

    const deleteTrigger = wrapper.findAll('button').find((button) => button.text() === 'Delete node')
    await deleteTrigger!.trigger('click')
    await wrapper.vm.$nextTick()

    const confirmButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent === 'Delete',
    )
    expect(confirmButton).toBeTruthy()
    confirmButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(useNodeDrawer().isOpen.value).toBe(false)
    expect(useNodeDrawer().selectedNodeId.value).toBeNull()
  })

  it('resizes the drawer while dragging the resize handle', async () => {
    useNodeDrawer().open(2)
    const wrapper = mountDrawer()

    await wrapper.find('.cursor-col-resize').trigger('mousedown', { clientX: 500 })
    expect(useNodeDrawer().isResizing.value).toBe(true)

    dispatchWindowMouseEvent('mousemove', 460)
    expect(useNodeDrawer().width.value).toBe(DRAWER_DEFAULT_WIDTH + 40)

    dispatchWindowMouseEvent('mouseup', 460)
    expect(useNodeDrawer().isResizing.value).toBe(false)
  })

  it('stops reacting to mouse movement once the drag ends', async () => {
    useNodeDrawer().open(2)
    const wrapper = mountDrawer()

    await wrapper.find('.cursor-col-resize').trigger('mousedown', { clientX: 500 })
    dispatchWindowMouseEvent('mouseup', 500)

    const widthAfterDrag = useNodeDrawer().width.value
    dispatchWindowMouseEvent('mousemove', 100)

    expect(useNodeDrawer().width.value).toBe(widthAfterDrag)
  })

  it('stops resizing and removes its window listeners when unmounted mid-drag', async () => {
    useNodeDrawer().open(2)
    const wrapper = mountDrawer()

    await wrapper.find('.cursor-col-resize').trigger('mousedown', { clientX: 500 })
    expect(useNodeDrawer().isResizing.value).toBe(true)

    wrapper.unmount()

    expect(useNodeDrawer().isResizing.value).toBe(false)

    const widthAfterUnmount = useNodeDrawer().width.value
    dispatchWindowMouseEvent('mousemove', 100)

    expect(useNodeDrawer().width.value).toBe(widthAfterUnmount)
  })
})
