import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FlowNode } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import { uploadAttachment } from '@/api/uploadApi'
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

  it('disables Save while an attachment is uploading so it is not dropped from the save', async () => {
    let resolveUpload!: (url: string) => void
    vi.mocked(uploadAttachment).mockReturnValueOnce(new Promise((resolve) => (resolveUpload = resolve)))
    const store = useFlowStore()
    const wrapper = mountPanel(2)
    const findSave = () => wrapper.findAll('button').find((button) => ['Save changes', 'Uploading…'].includes(button.text()))!

    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['content'], 'photo.png', { type: 'image/png' })] })
    await input.trigger('change')

    expect(findSave().text()).toBe('Uploading…')
    expect(findSave().attributes('disabled')).toBeDefined()

    resolveUpload('https://example.com/late.png')
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()
    expect(findSave().text()).toBe('Save changes')
    expect(findSave().attributes('disabled')).toBeUndefined()

    await findSave().trigger('click')
    const saved = store.nodes.find((node) => node.id === 2)
    expect(saved?.type === 'sendMessage' && saved.data.payload).toContainEqual({ type: 'attachment', attachment: 'https://example.com/late.png' })
  })

  it('shows an error and disables Save when the title is cleared', async () => {
    const store = useFlowStore()
    const wrapper = mountPanel(2)
    const saveButton = () => wrapper.findAll('button').find((button) => button.text() === 'Save changes')!
    const nameBefore = store.nodes.find((node) => node.id === 2)?.name

    await wrapper.find('#node-details-name').setValue('   ')

    expect(wrapper.text()).toContain('Title is required')
    expect(wrapper.find('#node-details-name').attributes('aria-invalid')).toBe('true')
    expect(saveButton().attributes('disabled')).toBeDefined()
    await saveButton().trigger('click')
    expect(store.nodes.find((node) => node.id === 2)?.name).toBe(nameBefore)

    await wrapper.find('#node-details-name').setValue('Renamed')
    expect(wrapper.text()).not.toContain('Title is required')
    expect(saveButton().attributes('disabled')).toBeUndefined()
  })

  it('disables Save while the business hours are invalid', async () => {
    const store = useFlowStore()
    store.nodes.push({
      id: 3,
      parentId: 1,
      type: 'dateTime',
      name: 'Opening hours',
      data: { times: [{ day: 'mon', startTime: '09:00', endTime: '17:00' }], connectors: [], timezone: 'UTC', action: 'businessHours' },
    })
    const wrapper = mountPanel(3)
    const saveButton = () => wrapper.findAll('button').find((button) => button.text() === 'Save changes')!
    expect(saveButton().attributes('disabled')).toBeUndefined()

    await wrapper.findAll('input[type="time"]')[0].setValue('18:00')

    expect(saveButton().attributes('disabled')).toBeDefined()
  })

  it('does not render any actions for non-editable nodes', () => {
    const wrapper = mountPanel(1)

    expect(wrapper.find('button').exists()).toBe(false)
  })
})
