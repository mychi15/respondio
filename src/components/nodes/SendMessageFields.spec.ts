import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SendMessageNode } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import { uploadAttachment } from '@/api/uploadApi'
import SendMessageFields from './SendMessageFields.vue'

const sendMessageNode: SendMessageNode = {
  id: 2,
  parentId: 1,
  type: 'sendMessage',
  name: 'Welcome message',
  data: {
    payload: [
      { type: 'text', text: 'Hi! Thanks for reaching out.' },
      { type: 'attachment', attachment: 'https://example-store.public.blob.vercel-storage.com/attachment-abc123.png' },
    ],
  },
}

function mountFields(node: SendMessageNode) {
  return mount(SendMessageFields, { props: { node } })
}

describe('SendMessageFields', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useFlowStore()
    store.nodes = [sendMessageNode]
  })

  it('renders the existing message text in a single textarea', () => {
    const wrapper = mountFields(sendMessageNode)

    const textareas = wrapper.findAll('textarea')
    expect(textareas).toHaveLength(1)
    expect(textareas[0].element.value).toBe('Hi! Thanks for reaching out.')
  })

  it('renders existing attachments as an image preview tile', () => {
    const wrapper = mountFields(sendMessageNode)

    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example-store.public.blob.vercel-storage.com/attachment-abc123.png')
  })

  it('does not persist edits until save is called', async () => {
    const store = useFlowStore()
    const wrapper = mountFields(sendMessageNode)

    await wrapper.find('textarea').setValue('Updated text')

    expect(
      (store.nodes[0] as SendMessageNode).data.payload.find((item) => item.type === 'text'),
    ).toMatchObject({ text: 'Hi! Thanks for reaching out.' })
  })

  it('saves edited text and preserves existing attachments', async () => {
    const store = useFlowStore()
    const wrapper = mountFields(sendMessageNode)

    await wrapper.find('textarea').setValue('Updated text')
    ;(wrapper.vm as unknown as { save: () => void }).save()

    const payload = (store.nodes[0] as SendMessageNode).data.payload
    expect(payload).toEqual([
      { type: 'text', text: 'Updated text' },
      { type: 'attachment', attachment: 'https://example-store.public.blob.vercel-storage.com/attachment-abc123.png' },
    ])
  })

  it('omits the text item on save when the message field is cleared', async () => {
    const store = useFlowStore()
    const wrapper = mountFields(sendMessageNode)

    await wrapper.find('textarea').setValue('   ')
    ;(wrapper.vm as unknown as { save: () => void }).save()

    const payload = (store.nodes[0] as SendMessageNode).data.payload
    expect(payload).toEqual([{ type: 'attachment', attachment: 'https://example-store.public.blob.vercel-storage.com/attachment-abc123.png' }])
  })

  it('uploads a picked file and appends it as an attachment once the upload resolves', async () => {
    const wrapper = mountFields(sendMessageNode)

    const file = new File(['content'], 'photo.png', { type: 'image/png' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    const images = wrapper.findAll('img')
    expect(images.some((img) => img.attributes('src') === 'https://example.com/mock-attachment.png')).toBe(true)
  })

  it('reports isUploading while an upload is in flight', async () => {
    let resolveUpload!: (url: string) => void
    vi.mocked(uploadAttachment).mockReturnValueOnce(new Promise((resolve) => (resolveUpload = resolve)))
    const wrapper = mountFields(sendMessageNode)
    expect(wrapper.vm.isUploading).toBe(false)

    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['content'], 'photo.png', { type: 'image/png' })] })
    await input.trigger('change')
    expect(wrapper.vm.isUploading).toBe(true)

    resolveUpload('https://example.com/late.png')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(wrapper.vm.isUploading).toBe(false)
  })

  it('removes an attachment when its remove button is clicked', async () => {
    const wrapper = mountFields(sendMessageNode)

    const removeButton = wrapper
      .findAll('button')
      .find((button) => button.find('.sr-only').exists() && button.find('.sr-only').text() === 'Remove attachment')
    await removeButton!.trigger('click')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })
})
