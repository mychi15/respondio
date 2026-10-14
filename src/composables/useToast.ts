import { ref } from 'vue'

export type ToastVariant = 'success' | 'warning' | 'error'

const DEFAULT_DURATION_MS: Record<ToastVariant, number> = { success: 2500, warning: 4000, error: 6000 }

/**
 * Singleton, shared state, same pattern as useNodeDrawer/useCreateNodeModal:
 * one toast is rendered once in CanvasView and triggered from anywhere.
 */
const message = ref('')
const variant = ref<ToastVariant>('success')
const isVisible = ref(false)

let hideTimeout: ReturnType<typeof setTimeout> | undefined

export function useToast() {
  function show(next: string, nextVariant: ToastVariant, durationMs = DEFAULT_DURATION_MS[nextVariant]) {
    clearTimeout(hideTimeout)
    message.value = next
    variant.value = nextVariant
    isVisible.value = true
    hideTimeout = setTimeout(() => {
      isVisible.value = false
    }, durationMs)
  }

  function dismiss() {
    clearTimeout(hideTimeout)
    isVisible.value = false
  }

  return { message, variant, isVisible, show, dismiss }
}
