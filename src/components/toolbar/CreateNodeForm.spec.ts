import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CreateNodeForm from './CreateNodeForm.vue'

// The real Select and NodeTreeSelect are headless-UI components built on
// reka-ui portals/positioning, which jsdom can't meaningfully render or
// interact with. Stubbing them as plain native inputs lets these tests
// exercise CreateNodeForm's own wiring (validation, conditional fields,
// emitted payload) without depending on that third-party UI behavior.
const SelectStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)"><slot /></select>`,
}
const SelectItemStub = {
  props: ['value'],
  template: `<option :value="value"><slot /></option>`,
}
// A bare fragment (no wrapping element) so <option> stubs land as direct
// children of the native <select> above — jsdom ignores <option>s nested
// inside another element when resolving select.options/.value.
const PassthroughStub = { template: '<slot />' }
const NodeTreeSelectStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<select data-testid="parent-select" :value="modelValue ?? ''" @change="$emit('update:modelValue', $event.target.value === '' ? null : Number($event.target.value))">
    <option value="">none</option>
    <option value="1">Node 1</option>
  </select>`,
}

function mountForm(props: { types: readonly ('trigger' | 'sendMessage' | 'addComment' | 'dateTime')[], requiresParent: boolean }) {
  return mount(CreateNodeForm, {
    props,
    global: {
      stubs: {
        Select: SelectStub,
        SelectItem: SelectItemStub,
        SelectTrigger: PassthroughStub,
        SelectContent: PassthroughStub,
        SelectValue: PassthroughStub,
        NodeTreeSelect: NodeTreeSelectStub,
      },
    },
  })
}

async function selectType(wrapper: ReturnType<typeof mountForm>, type: string) {
  await wrapper.find('select').setValue(type)
}

describe('CreateNodeForm', () => {
  it('shows the title and description fields by default (no type selected yet)', () => {
    const wrapper = mountForm({ types: ['sendMessage', 'addComment', 'dateTime'], requiresParent: false })

    expect(wrapper.find('#create-node-name').exists()).toBe(true)
    expect(wrapper.find('#create-node-description').exists()).toBe(true)
  })

  it('hides the title and description fields once trigger is selected', async () => {
    const wrapper = mountForm({ types: ['trigger', 'sendMessage'], requiresParent: false })

    await selectType(wrapper, 'trigger')

    expect(wrapper.find('#create-node-name').exists()).toBe(false)
    expect(wrapper.find('#create-node-description').exists()).toBe(false)
  })

  it('only shows the parent picker when requiresParent is set and the type is not trigger', async () => {
    const wrapper = mountForm({ types: ['trigger', 'sendMessage'], requiresParent: true })

    await selectType(wrapper, 'sendMessage')
    expect(wrapper.find('[data-testid="parent-select"]').exists()).toBe(true)

    await selectType(wrapper, 'trigger')
    expect(wrapper.find('[data-testid="parent-select"]').exists()).toBe(false)
  })

  it('hides the parent picker when requiresParent is not set, even for a non-trigger type', async () => {
    const wrapper = mountForm({ types: ['sendMessage'], requiresParent: false })

    await selectType(wrapper, 'sendMessage')

    expect(wrapper.find('[data-testid="parent-select"]').exists()).toBe(false)
  })

  it('blocks submit and reports an error when no type is selected', async () => {
    const wrapper = mountForm({ types: ['sendMessage'], requiresParent: false })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Type is required')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('blocks submit and reports an error when a non-trigger type has no title', async () => {
    const wrapper = mountForm({ types: ['sendMessage'], requiresParent: false })

    await selectType(wrapper, 'sendMessage')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Title is required')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('blocks submit and reports an error when a parent is required but not selected', async () => {
    const wrapper = mountForm({ types: ['sendMessage'], requiresParent: true })

    await selectType(wrapper, 'sendMessage')
    await wrapper.find('#create-node-name').setValue('Follow up')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Parent node is required')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('emits submit with the trimmed name/description and omits both for a trigger node', async () => {
    const wrapper = mountForm({ types: ['trigger'], requiresParent: false })

    await selectType(wrapper, 'trigger')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([[{ name: undefined, description: undefined, type: 'trigger', parentId: null }]])
  })

  it('emits submit with trimmed name/description and the selected parent for a non-trigger node', async () => {
    const wrapper = mountForm({ types: ['sendMessage'], requiresParent: true })

    await selectType(wrapper, 'sendMessage')
    await wrapper.find('#create-node-name').setValue('  Follow up  ')
    await wrapper.find('#create-node-description').setValue('  ask about order status  ')
    await wrapper.find('[data-testid="parent-select"]').setValue('1')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([
      [{ name: 'Follow up', description: 'ask about order status', type: 'sendMessage', parentId: 1 }],
    ])
  })

  it('omits description from the payload when left blank', async () => {
    const wrapper = mountForm({ types: ['addComment'], requiresParent: false })

    await selectType(wrapper, 'addComment')
    await wrapper.find('#create-node-name').setValue('Note')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([[{ name: 'Note', description: undefined, type: 'addComment', parentId: null }]])
  })
})
