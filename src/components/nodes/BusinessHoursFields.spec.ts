import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { BusinessHoursNode } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import BusinessHoursFields from './BusinessHoursFields.vue'

// The real Select/Combobox are headless-UI components built on reka-ui
// portals/positioning, which jsdom can't meaningfully render or interact
// with. Stubbing them as plain native <select>s lets these tests exercise
// BusinessHoursFields' own wiring (draft state, validation, save) without
// depending on that third-party UI behavior — same approach as
// CreateNodeForm.spec.ts.
const SelectStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)"><slot /></select>`,
}
const SelectItemStub = {
  props: ['value'],
  template: `<option :value="value"><slot /></option>`,
}
const PassthroughStub = { template: '<slot />' }
const HiddenStub = { template: '<span style="display:none" />' }

const businessHoursNode: BusinessHoursNode = {
  id: 3,
  parentId: 1,
  type: 'dateTime',
  name: 'Business Hours',
  data: {
    times: [{ day: 'mon', startTime: '09:00', endTime: '18:00' }],
    connectors: [4, 5],
    timezone: 'UTC',
    action: 'businessHours',
  },
}

function mountFields(node: BusinessHoursNode) {
  return mount(BusinessHoursFields, {
    props: { node },
    global: {
      stubs: {
        Combobox: SelectStub,
        ComboboxAnchor: PassthroughStub,
        ComboboxContent: PassthroughStub,
        ComboboxEmpty: PassthroughStub,
        ComboboxInput: HiddenStub,
        ComboboxTrigger: HiddenStub,
        ComboboxItem: SelectItemStub,
        Select: SelectStub,
        SelectItem: SelectItemStub,
        SelectTrigger: PassthroughStub,
        SelectContent: PassthroughStub,
        SelectValue: PassthroughStub,
      },
    },
  })
}

describe('BusinessHoursFields', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useFlowStore()
    store.nodes = [businessHoursNode]
  })

  it('falls back to the browser timezone when the node has no timezone set', () => {
    const node: BusinessHoursNode = {
      ...businessHoursNode,
      data: { ...businessHoursNode.data, timezone: '' },
    }
    const wrapper = mountFields(node)

    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(wrapper.findAll('select')[0].element.value).toBe(browserTimezone)
  })

  it('shows a validation message when the start time is not before the end time', async () => {
    const wrapper = mountFields(businessHoursNode)

    const timeInputs = wrapper.findAll('input[type="time"]')
    await timeInputs[0].setValue('18:00')
    await timeInputs[1].setValue('09:00')

    expect(wrapper.text()).toContain('Start time must be before end time')
  })

  it('removes a time row when its remove button is clicked', async () => {
    const wrapper = mountFields(businessHoursNode)

    const removeButton = wrapper
      .findAll('button')
      .find((button) => button.find('.sr-only').exists() && button.find('.sr-only').text() === 'Remove time')
    await removeButton!.trigger('click')

    expect(wrapper.findAll('input[type="time"]')).toHaveLength(0)
  })

  it('does not persist edits until save is called', async () => {
    const store = useFlowStore()
    const wrapper = mountFields(businessHoursNode)

    await wrapper.findAll('select')[0].setValue('Asia/Tokyo')

    expect((store.nodes[0] as BusinessHoursNode).data.timezone).toBe('UTC')
  })

  it('saves the edited timezone and time rows', async () => {
    const store = useFlowStore()
    const wrapper = mountFields(businessHoursNode)

    await wrapper.findAll('select')[0].setValue('Asia/Tokyo')
    const timeInputs = wrapper.findAll('input[type="time"]')
    await timeInputs[0].setValue('10:00')
    await timeInputs[1].setValue('19:00')

    ;(wrapper.vm as unknown as { save: () => void }).save()

    const saved = (store.nodes[0] as BusinessHoursNode).data
    expect(saved.timezone).toBe('Asia/Tokyo')
    expect(saved.times).toEqual([{ day: 'mon', startTime: '10:00', endTime: '19:00' }])
  })

  it('resets the draft when the node prop changes', async () => {
    const wrapper = mountFields(businessHoursNode)

    const otherNode: BusinessHoursNode = {
      ...businessHoursNode,
      id: 9,
      data: { ...businessHoursNode.data, timezone: 'Asia/Tokyo', times: [] },
    }
    await wrapper.setProps({ node: otherNode })

    expect(wrapper.findAll('select')[0].element.value).toBe('Asia/Tokyo')
    expect(wrapper.findAll('input[type="time"]')).toHaveLength(0)
  })
})
