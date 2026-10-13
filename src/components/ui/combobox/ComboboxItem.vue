<script setup lang="ts">
import type { ComboboxItemEmits, ComboboxItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { CheckIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { ComboboxItem, ComboboxItemIndicator, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<ComboboxItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<ComboboxItemEmits>()

const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <ComboboxItem
    data-slot="combobox-item"
    v-bind="forwarded"
    :class="
      cn(
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground min-h-7 gap-2 rounded-md px-2 py-1 text-xs/relaxed relative flex w-full cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3.5',
        props.class,
      )
    "
  >
    <span class="pointer-events-none absolute right-2 flex items-center justify-center">
      <ComboboxItemIndicator>
        <CheckIcon class="pointer-events-none" />
      </ComboboxItemIndicator>
    </span>

    <slot />
  </ComboboxItem>
</template>
