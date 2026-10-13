import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCreateNodeModal } from '@/composables/useCreateNodeModal'
import { useFlowStore } from '@/stores/useFlowStore'
import CreateNodeForm from './CreateNodeForm.vue'
import CreateNodeModal from './CreateNodeModal.vue'

// DialogContent teleports to document.body and only renders once the dialog
// has actually opened, so tests attach to the body and flush a tick first.
function mountOpen() {
  return mount(CreateNodeModal, { attachTo: document.body })
}

function submit(wrapper: ReturnType<typeof mountOpen>, input: { name?: string; description?: string; type: string; parentId: string | number | null }) {
  wrapper.findComponent(CreateNodeForm).vm.$emit('submit', input)
}

describe('CreateNodeModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCreateNodeModal().close()
  })

  it('is closed with no invocation and reopens when the composable opens it', async () => {
    const wrapper = mountOpen()
    expect(wrapper.findComponent(CreateNodeForm).exists()).toBe(false)

    useCreateNodeModal().open({ source: 'toolbar' })
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(CreateNodeForm).exists()).toBe(true)
  })

  it('passes toolbar-creatable types and requiresParent through to the form for a toolbar invocation', async () => {
    useCreateNodeModal().open({ source: 'toolbar' })
    const wrapper = mountOpen()
    await wrapper.vm.$nextTick()

    const form = wrapper.findComponent(CreateNodeForm)
    expect(form.props('requiresParent')).toBe(true)
    expect(form.props('types')).toContain('trigger')
  })

  it('passes only non-trigger creatable types and requiresParent=false for a quickAdd invocation', async () => {
    useCreateNodeModal().open({ source: 'quickAdd', attachment: { mode: 'add', parentId: 1 } })
    const wrapper = mountOpen()
    await wrapper.vm.$nextTick()

    const form = wrapper.findComponent(CreateNodeForm)
    expect(form.props('requiresParent')).toBe(false)
    expect(form.props('types')).not.toContain('trigger')
  })

  it('creates a root trigger node regardless of invocation source and closes the modal', async () => {
    useCreateNodeModal().open({ source: 'toolbar' })
    const store = useFlowStore()
    const before = store.nodes.length
    const wrapper = mountOpen()
    await wrapper.vm.$nextTick()

    submit(wrapper, { type: 'trigger', parentId: null })

    expect(store.nodes).toHaveLength(before + 1)
    expect(store.nodes.at(-1)?.parentId).toBe(-1)
    expect(useCreateNodeModal().isOpen.value).toBe(false)
  })

  it('uses the invocation attachment for a quickAdd submission', async () => {
    useCreateNodeModal().open({ source: 'quickAdd', attachment: { mode: 'add', parentId: 2 } })
    const store = useFlowStore()
    const before = store.nodes.length
    const wrapper = mountOpen()
    await wrapper.vm.$nextTick()

    submit(wrapper, { name: 'Step', description: '', type: 'sendMessage', parentId: null })

    expect(store.nodes).toHaveLength(before + 1)
    expect(store.nodes.at(-1)?.parentId).toBe(2)
  })

  it('attaches to the submitted parentId for a toolbar submission', async () => {
    useCreateNodeModal().open({ source: 'toolbar' })
    const store = useFlowStore()
    const before = store.nodes.length
    const wrapper = mountOpen()
    await wrapper.vm.$nextTick()

    submit(wrapper, { name: 'Step', description: '', type: 'sendMessage', parentId: 3 })

    expect(store.nodes).toHaveLength(before + 1)
    expect(store.nodes.at(-1)?.parentId).toBe(3)
  })

  it('does nothing for a non-trigger toolbar submission with no parentId', async () => {
    useCreateNodeModal().open({ source: 'toolbar' })
    const store = useFlowStore()
    const before = store.nodes.length
    const wrapper = mountOpen()
    await wrapper.vm.$nextTick()

    submit(wrapper, { name: 'Step', description: '', type: 'sendMessage', parentId: null })

    expect(store.nodes).toHaveLength(before)
    expect(useCreateNodeModal().isOpen.value).toBe(true)
  })

  it('does nothing when there is no active invocation', async () => {
    const store = useFlowStore()
    const before = store.nodes.length
    // Force the dialog open with no invocation, a state the composable's own
    // open()/close() pair never produces but handleSubmit must still guard against.
    useCreateNodeModal().isOpen.value = true
    const wrapper = mountOpen()
    await wrapper.vm.$nextTick()

    submit(wrapper, { type: 'trigger', parentId: null })

    expect(store.nodes).toHaveLength(before)
  })
})
