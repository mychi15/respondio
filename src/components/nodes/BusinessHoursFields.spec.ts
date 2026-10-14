import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BusinessHoursNode } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import BusinessHoursFields from './BusinessHoursFields.vue'

// Pinned so the fallback test doesn't depend on the machine's zone — CI
// runners report "UTC", which isn't in TIMEZONE_OPTIONS.
const BROWSER_TIMEZONE = 'Asia/Kuala_Lumpur'
vi.mock('@/utils/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/helpers')>()),
  getBrowserTimezone: () => BROWSER_TIMEZONE,
}))

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

function mountFields(node: BusinessHoursNode, options: { attachTo?: HTMLElement } = {}) {
  return mount(BusinessHoursFields, {
    props: { node },
    ...options,
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

function findRemoveButton(wrapper: ReturnType<typeof mountFields>, rowNumber: number) {
  return wrapper.findAll('button').find((button) => button.find('.sr-only').exists() && button.find('.sr-only').text() === `Remove time range ${rowNumber}`)
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

    expect(wrapper.findAll('select')[0].element.value).toBe(BROWSER_TIMEZONE)
  })

  it('shows a validation message when the start time is not before the end time', async () => {
    const wrapper = mountFields(businessHoursNode)

    const timeInputs = wrapper.findAll('input[type="time"]')
    await timeInputs[0].setValue('18:00')
    await timeInputs[1].setValue('09:00')

    expect(wrapper.text()).toContain('Start time must be before end time')
  })

  it('flags a duplicate row on the same day and reports the form as invalid', async () => {
    const wrapper = mountFields(businessHoursNode)
    expect(wrapper.vm.isValid).toBe(true)

    await wrapper.findAll('button').find((button) => button.text() === 'Add time')!.trigger('click')
    // The new row starts on an unused day; move it onto Monday with the same start time.
    await wrapper.findAll('select')[2].setValue('mon')
    const timeInputs = wrapper.findAll('input[type="time"]')
    await timeInputs[2].setValue('09:00')
    await timeInputs[3].setValue('12:00')

    expect(wrapper.text()).toContain('Another row on this day already starts or ends at this time')
    expect(timeInputs[2].attributes('aria-invalid')).toBe('true')
    expect(wrapper.vm.isValid).toBe(false)
  })

  it('reports the form as invalid while a row has its start after its end', async () => {
    const wrapper = mountFields(businessHoursNode)

    const timeInputs = wrapper.findAll('input[type="time"]')
    await timeInputs[0].setValue('18:00')
    await timeInputs[1].setValue('09:00')

    expect(wrapper.vm.isValid).toBe(false)
  })

  it('adds a new row on the first weekday that has no hours yet', async () => {
    const wrapper = mountFields(businessHoursNode)

    await wrapper.findAll('button').find((button) => button.text() === 'Add time')!.trigger('click')

    expect(wrapper.findAll('select')[2].element.value).toBe('tue')
    expect(wrapper.text()).not.toContain('Another row on this day')
  })

  it('removes a time row when its remove button is clicked', async () => {
    const wrapper = mountFields(businessHoursNode)

    await findRemoveButton(wrapper, 1)!.trigger('click')

    expect(wrapper.findAll('input[type="time"]')).toHaveLength(0)
  })

  it('labels the hours as a group and numbers each row as its own group', () => {
    const wrapper = mountFields(businessHoursNode)

    const hours = wrapper.find('[role="group"][aria-labelledby]')
    expect(wrapper.find(`#${hours.attributes('aria-labelledby')}`).text()).toBe('Business hours')
    expect(hours.find('[role="group"]').attributes('aria-label')).toBe('Time range 1')
    expect(findRemoveButton(wrapper, 1)).toBeDefined()
  })

  it('gives the real day picker an accessible name', () => {
    const wrapper = mount(BusinessHoursFields, { props: { node: businessHoursNode } })

    expect(wrapper.find('[data-slot="select-trigger"]').attributes('aria-label')).toBe('Day')
  })

  it('says when no business hours are set', async () => {
    const wrapper = mountFields({ ...businessHoursNode, data: { ...businessHoursNode.data, times: [] } })

    expect(wrapper.text()).toContain('No business hours set.')
  })

  it('moves focus into a newly added row', async () => {
    const wrapper = mountFields(businessHoursNode, { attachTo: document.body })

    await wrapper.find('[data-add-time]').trigger('click')
    await flushPromises()

    expect(document.activeElement).toBe(wrapper.findAll('[data-time-row]')[1].find('select').element)
    wrapper.unmount()
  })

  it('keeps focus in the list when a row is removed, falling back to Add time once it is empty', async () => {
    const twoRows: BusinessHoursNode = {
      ...businessHoursNode,
      data: { ...businessHoursNode.data, times: [...businessHoursNode.data.times, { day: 'tue', startTime: '09:00', endTime: '18:00' }] },
    }
    const wrapper = mountFields(twoRows, { attachTo: document.body })

    await findRemoveButton(wrapper, 1)!.trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.find('[data-time-row] select').element)

    await findRemoveButton(wrapper, 1)!.trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.find('[data-add-time]').element)
    wrapper.unmount()
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
