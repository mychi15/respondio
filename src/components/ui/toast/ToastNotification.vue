<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import { CircleCheck, CircleX, TriangleAlert, X } from '@lucide/vue'
import { useToast } from '@/composables/useToast'
import type { ToastVariant } from '@/composables/useToast'

const { message, variant, isVisible, dismiss } = useToast()

const VARIANT_STYLES: Record<ToastVariant, { icon: Component; container: string; iconClass: string; dismiss: string }> = {
  success: {
    icon: CircleCheck,
    container: 'border-success-border bg-success-muted text-success-foreground',
    iconClass: 'text-success',
    dismiss: 'text-success-foreground/70 hover:text-success-foreground',
  },
  warning: {
    icon: TriangleAlert,
    container: 'border-warning-border bg-warning-muted text-warning-foreground',
    iconClass: 'text-warning',
    dismiss: 'text-warning-foreground/70 hover:text-warning-foreground',
  },
  error: {
    icon: CircleX,
    container: 'border-error-border bg-error-muted text-error-foreground',
    iconClass: 'text-error',
    dismiss: 'text-error-foreground/70 hover:text-error-foreground',
  },
}

const styles = computed(() => VARIANT_STYLES[variant.value])
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <!-- Errors interrupt (role="alert"); success and warnings wait politely. -->
    <div
      v-if="isVisible"
      :role="variant === 'error' ? 'alert' : 'status'"
      :aria-live="variant === 'error' ? 'assertive' : 'polite'"
      :data-variant="variant"
      class="pointer-events-auto flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-md"
      :class="styles.container"
    >
      <component :is="styles.icon" class="size-4 shrink-0" :class="styles.iconClass" aria-hidden="true" />
      <span>{{ message }}</span>
      <button
        type="button"
        :class="styles.dismiss"
        aria-label="Dismiss notification"
        @click="dismiss"
      >
        <X class="size-3.5" aria-hidden="true" />
      </button>
    </div>
  </Transition>
</template>
