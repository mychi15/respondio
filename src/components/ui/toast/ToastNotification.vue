<script setup lang="ts">
import { CircleCheck, X } from '@lucide/vue'
import { useToast } from '@/composables/useToast'

const { message, isVisible, dismiss } = useToast()
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
    <div
      v-if="isVisible"
      role="status"
      aria-live="polite"
      class="pointer-events-auto flex items-center gap-2 rounded-lg border border-success-border bg-success-muted px-3 py-2 text-sm text-success-foreground shadow-md"
    >
      <CircleCheck class="size-4 shrink-0 text-success" />
      <span>{{ message }}</span>
      <button
        type="button"
        class="text-success-foreground/70 hover:text-success-foreground"
        aria-label="Dismiss notification"
        @click="dismiss"
      >
        <X class="size-3.5" />
      </button>
    </div>
  </Transition>
</template>
