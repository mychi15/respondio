import { ref } from 'vue'

/**
 * Module-level shared state, same pattern as useNodeDrawer/useCreateNodeModal:
 * one toast is rendered once near the app root and triggered from anywhere.
 */
const message = ref('')
const isVisible = ref(false)

let hideTimeout: ReturnType<typeof setTimeout> | undefined

export function useToast() {
  function show(next: string, durationMs = 2500) {
    clearTimeout(hideTimeout)
    message.value = next
    isVisible.value = true
    hideTimeout = setTimeout(() => {
      isVisible.value = false
    }, durationMs)
  }

  function dismiss() {
    clearTimeout(hideTimeout)
    isVisible.value = false
  }

  return { message, isVisible, show, dismiss }
}
