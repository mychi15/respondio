import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AddCommentNode } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import AddCommentFields from './AddCommentFields.vue'

const addCommentNode: AddCommentNode = {
  id: 2,
  parentId: 1,
  type: 'addComment',
  name: 'Internal note',
  data: { comment: 'Follow up with the customer.' },
}

function mountFields(node: AddCommentNode) {
  return mount(AddCommentFields, { props: { node } })
}

describe('AddCommentFields', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useFlowStore()
    store.nodes = [addCommentNode]
  })

  it('renders the existing comment text', () => {
    const wrapper = mountFields(addCommentNode)

    expect(wrapper.find('textarea').element.value).toBe('Follow up with the customer.')
  })

  it('does not persist edits until save is called', async () => {
    const store = useFlowStore()
    const wrapper = mountFields(addCommentNode)

    await wrapper.find('textarea').setValue('Updated comment')

    expect((store.nodes[0] as AddCommentNode).data.comment).toBe('Follow up with the customer.')
  })

  it('saves the edited comment', async () => {
    const store = useFlowStore()
    const wrapper = mountFields(addCommentNode)

    await wrapper.find('textarea').setValue('Updated comment')
    ;(wrapper.vm as unknown as { save: () => void }).save()

    expect((store.nodes[0] as AddCommentNode).data.comment).toBe('Updated comment')
  })

  it('trims whitespace when saving', async () => {
    const store = useFlowStore()
    const wrapper = mountFields(addCommentNode)

    await wrapper.find('textarea').setValue('   padded   ')
    ;(wrapper.vm as unknown as { save: () => void }).save()

    expect((store.nodes[0] as AddCommentNode).data.comment).toBe('padded')
  })

  it('resets the draft when the node prop changes', async () => {
    const wrapper = mountFields(addCommentNode)

    const otherNode: AddCommentNode = { ...addCommentNode, id: 9, data: { comment: 'A different comment' } }
    await wrapper.setProps({ node: otherNode })

    expect(wrapper.find('textarea').element.value).toBe('A different comment')
  })
})
