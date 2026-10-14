import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { useToast } from '@/composables/useToast'
import ToastNotification from './ToastNotification.vue'

describe('ToastNotification', () => {
  afterEach(() => {
    useToast().dismiss()
  })

  it('renders nothing until a toast is shown', () => {
    expect(mount(ToastNotification).find('[data-variant]').exists()).toBe(false)
  })

  it.each([
    ['success', 'status', 'polite', 'bg-success-muted', 'lucide-circle-check'],
    ['warning', 'status', 'polite', 'bg-warning-muted', 'lucide-triangle-alert'],
    ['error', 'alert', 'assertive', 'bg-error-muted', 'lucide-circle-x'],
  ] as const)('styles a %s toast with its own colors, icon and urgency', async (variant, role, live, background, iconClass) => {
    const wrapper = mount(ToastNotification)

    useToast().show('Something happened', variant)
    await wrapper.vm.$nextTick()

    const toast = wrapper.find('[data-variant]')
    expect(toast.attributes()).toMatchObject({ 'data-variant': variant, role, 'aria-live': live })
    expect(toast.classes()).toContain(background)
    expect(toast.find('svg').classes()).toContain(iconClass)
    expect(toast.text()).toContain('Something happened')
  })
})
