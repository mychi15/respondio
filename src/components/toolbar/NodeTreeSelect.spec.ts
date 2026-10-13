import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FlowNode } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import NodeTreeSelect from './NodeTreeSelect.vue'

const triggerNode: FlowNode = {
  id: 1,
  parentId: -1,
  type: 'trigger',
  data: { type: 'conversationOpened', oncePerContact: true },
}

const sendMessageNode: FlowNode = {
  id: 2,
  parentId: 1,
  name: 'Welcome message',
  type: 'sendMessage',
  data: { payload: [] },
}

const businessHoursNode: FlowNode = {
  id: 3,
  parentId: 1,
  type: 'dateTime',
  data: { times: [], connectors: [], timezone: 'UTC', action: 'businessHours' },
}

async function openPopover(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('button').trigger('click')
  await flushPromises()
}

describe('NodeTreeSelect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useFlowStore()
    store.nodes = [triggerNode, sendMessageNode, businessHoursNode]
  })

  it('shows the placeholder label when no node is selected', () => {
    const wrapper = mount(NodeTreeSelect, { attachTo: document.body })

    expect(wrapper.find('button').text()).toBe('Select parent node')

    wrapper.unmount()
  })

  it('shows the selected node label derived from the tree', () => {
    const wrapper = mount(NodeTreeSelect, {
      attachTo: document.body,
      props: { modelValue: 2 },
    })

    expect(wrapper.find('button').text()).toBe('Welcome message')

    wrapper.unmount()
  })

  it('lists every node in the tree and disables non-addable node types', async () => {
    const wrapper = mount(NodeTreeSelect, { attachTo: document.body })

    await openPopover(wrapper)

    const options = Array.from(document.body.querySelectorAll('[data-slot="popover-content"] button'))
    expect(options.map((option) => option.textContent?.trim())).toEqual(['Trigger', 'Welcome message', 'Business Hours'])

    const businessHoursOption = options.find((option) => option.textContent?.trim() === 'Business Hours')
    expect(businessHoursOption?.hasAttribute('disabled')).toBe(true)

    wrapper.unmount()
  })

  it('emits the selected node id and closes the popover when an addable option is clicked', async () => {
    const wrapper = mount(NodeTreeSelect, { attachTo: document.body })

    await openPopover(wrapper)

    const options = Array.from(document.body.querySelectorAll('[data-slot="popover-content"] button'))
    const welcomeOption = options.find((option) => option.textContent?.trim() === 'Welcome message') as HTMLButtonElement
    welcomeOption.click()
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
    expect(document.body.querySelector('[data-slot="popover-content"]')).toBeNull()

    wrapper.unmount()
  })

  it('does not select a non-addable node when its disabled option is clicked', async () => {
    const wrapper = mount(NodeTreeSelect, { attachTo: document.body })

    await openPopover(wrapper)

    const options = Array.from(document.body.querySelectorAll('[data-slot="popover-content"] button'))
    const businessHoursOption = options.find((option) => option.textContent?.trim() === 'Business Hours') as HTMLButtonElement
    businessHoursOption.click()
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    wrapper.unmount()
  })
})
