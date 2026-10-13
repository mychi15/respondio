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
      class="pointer-events-auto flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 shadow-md dark:border-green-900 dark:bg-green-950 dark:text-green-200"
    >
      <CircleCheck class="size-4 shrink-0 text-green-600 dark:text-green-400" />
      <span>{{ message }}</span>
      <button
        type="button"
        class="text-green-600/70 hover:text-green-700 dark:text-green-400/70 dark:hover:text-green-300"
        aria-label="Dismiss notification"
        @click="dismiss"
      >
        <X class="size-3.5" />
      </button>
    </div>
  </Transition>
</template>
