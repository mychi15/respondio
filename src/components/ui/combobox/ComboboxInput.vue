<script setup lang="ts">
import type { ComboboxInputEmits, ComboboxInputProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ComboboxInput, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<ComboboxInputProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<ComboboxInputEmits>()

const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <ComboboxInput
    data-slot="combobox-input"
    v-bind="forwarded"
    :class="cn(
      'h-full flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-xs/relaxed',
      props.class,
    )"
  />
</template>
