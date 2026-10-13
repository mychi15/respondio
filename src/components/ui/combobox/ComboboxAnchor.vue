<script setup lang="ts">
import type { ComboboxAnchorProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ComboboxAnchor } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<ComboboxAnchorProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <ComboboxAnchor
    data-slot="combobox-anchor"
    v-bind="delegatedProps"
    :class="cn(
      'border-input bg-input/20 dark:bg-input/30 dark:hover:bg-input/50 focus-within:border-ring focus-within:ring-ring/30 flex h-7 w-full items-center gap-1.5 rounded-md border pr-2 transition-colors focus-within:ring-2',
      props.class,
    )"
  >
    <slot />
  </ComboboxAnchor>
</template>
