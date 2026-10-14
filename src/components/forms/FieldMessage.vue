<script setup lang="ts">
import { computed } from 'vue'

/**
 * The line under a form field: its validation error (referenced by the
 * field's aria-describedby via `id`) and, for length-limited fields, a
 * character counter.
 */
const props = defineProps<{ id: string; error?: string; length?: number; maxLength?: number }>()

// Shown once the field nears its limit, so short entries stay uncluttered.
// Hidden from screen readers: the error message already states the limit.
const showCounter = computed(() => props.maxLength !== undefined && (props.length ?? 0) >= props.maxLength * 0.8)
const isOver = computed(() => props.maxLength !== undefined && (props.length ?? 0) > props.maxLength)
</script>

<template>
  <div v-if="error || showCounter" class="flex items-start justify-between gap-2 text-xs">
    <p :id="id" class="text-red-500">{{ error }}</p>
    <span v-if="showCounter" aria-hidden="true" class="shrink-0 tabular-nums" :class="isOver ? 'text-red-500' : 'text-gray-500'">
      {{ length }}/{{ maxLength }}
    </span>
  </div>
</template>
