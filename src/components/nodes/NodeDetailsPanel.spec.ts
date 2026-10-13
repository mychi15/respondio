import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FlowNode } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import NodeDetailsPanel from './NodeDetailsPanel.vue'

const triggerNode: FlowNode = {
  id: 1,
  parentId: -1,
  type: 'trigger',
  data: { type: 'conversationOpened', oncePerContact: true },
}

const sendMessageNode: FlowNode = {
  id: 2,
  parentId: 1,
  type: 'sendMessage',
  name: 'Welcome message',
  description: 'Greets the contact',
  data: { payload: [] },
}

function mountPanel(nodeId: FlowNode['id']) {
  return mount(NodeDetailsPanel, { props: { nodeId }, attachTo: document.body })
}

describe('NodeDetailsPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useFlowStore()
    store.nodes = [triggerNode, sendMessageNode]
  })

  it('shows a not-found message when no node matches the id', () => {
    const wrapper = mountPanel(999)

    expect(wrapper.text()).toContain('Node not found.')
  })

  it('shows a not-editable message for non-interactive node types', () => {
    const wrapper = mountPanel(1)

    expect(wrapper.text()).toContain("Trigger nodes aren't editable.")
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('renders the current name and description for an editable node', () => {
    const wrapper = mountPanel(2)

    expect(wrapper.find('input').element.value).toBe('Welcome message')
    expect(wrapper.find('textarea').element.value).toBe('Greets the contact')
  })

  it('resets the form when the node prop changes', async () => {
    const wrapper = mountPanel(2)

    await wrapper.setProps({ nodeId: 1 })

    expect(wrapper.text()).toContain("Trigger nodes aren't editable.")
  })

  it('does not persist edits until Save changes is clicked', async () => {
    const store = useFlowStore()
    const wrapper = mountPanel(2)

    await wrapper.find('input').setValue('Updated name')
    await wrapper.find('input').trigger('blur')

    expect(store.nodes.find((node) => node.id === 2)?.name).toBe('Welcome message')
  })

  it('saves the trimmed name when Save changes is clicked', async () => {
    const store = useFlowStore()
    const wrapper = mountPanel(2)

    await wrapper.find('input').setValue('  Updated name  ')
    await wrapper.findAll('button').find((button) => button.text() === 'Save changes')!.trigger('click')

    expect(store.nodes.find((node) => node.id === 2)?.name).toBe('Updated name')
  })

  it('saves the trimmed description when Save changes is clicked, clearing it when blank', async () => {
    const store = useFlowStore()
    const wrapper = mountPanel(2)

    await wrapper.find('textarea').setValue('   ')
    await wrapper.findAll('button').find((button) => button.text() === 'Save changes')!.trigger('click')

    expect(store.nodes.find((node) => node.id === 2)?.description).toBeUndefined()
  })

  it('exposes the matched node through the default slot', () => {
    const wrapper = mount(NodeDetailsPanel, {
      props: { nodeId: 2 },
      attachTo: document.body,
      slots: {
        default: ({ node }: { node: FlowNode }) => `slot-node-id:${node.id}`,
      },
    })

    expect(wrapper.text()).toContain('slot-node-id:2')
  })

  it('does not render any actions for non-editable nodes', () => {
    const wrapper = mountPanel(1)

    expect(wrapper.find('button').exists()).toBe(false)
  })
})
