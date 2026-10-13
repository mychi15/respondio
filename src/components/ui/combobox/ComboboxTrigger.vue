<script setup lang="ts">
import type { ComboboxTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { ChevronDownIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { ComboboxTrigger } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<ComboboxTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <ComboboxTrigger
    data-slot="combobox-trigger"
    v-bind="delegatedProps"
    :class="cn('shrink-0 text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50', props.class)"
  >
    <slot>
      <ChevronDownIcon class="size-3.5" />
    </slot>
  </ComboboxTrigger>
</template>
