<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@vue-flow/core'
import type { EdgeProps } from '@vue-flow/core'
import type { AddEdgeData } from '@/utils/flowGraph'
import { useCreateNodeModal } from '@/composables/useCreateNodeModal'
import { PlusCircleIcon } from '@/components/icons'

const props = defineProps<EdgeProps<AddEdgeData>>()

const createNodeModal = useCreateNodeModal()

const hovered = ref(false)

const isAdd = computed(() => props.data?.kind === 'add')

const path = computed(() =>
  getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 4,
  }),
)

const isAddable = computed(() => props.data?.addable !== false)

const hoverColor = computed(() => props.data?.hoverColor ?? '#f97316')

const edgeStyle = computed(() => ({
  ...(props.style as Record<string, unknown>),
  strokeDasharray: isAdd.value ? '6 4' : undefined,
  stroke: props.selected ? hoverColor.value : isAdd.value ? (hovered.value ? hoverColor.value : '#9ca3af') : hoverColor.value,
  strokeWidth: props.selected ? 2.5 : undefined,
  transition: 'stroke 150ms ease',
}))

const buttonX = computed(() => (isAdd.value ? props.targetX : path.value[1]))

const buttonY = computed(() => (isAdd.value ? props.targetY : path.value[2]))

const buttonStyle = computed<CSSProperties>(() => ({
  position: 'absolute',
  transform: `translate(-50%, -50%) translate(${buttonX.value}px, ${buttonY.value}px)`,
  pointerEvents: 'all',
  borderColor: isAdd.value ? (hovered.value ? hoverColor.value : undefined) : hoverColor.value,
  color: isAdd.value ? (hovered.value ? hoverColor.value : undefined) : hoverColor.value,
}))

function handleClick() {
  if (!props.data) return

  if (props.data.kind === 'insert' && props.data.targetId !== undefined) {
    createNodeModal.open({
      source: 'quickAdd',
      attachment: { mode: 'insert', sourceId: props.data.sourceId, targetId: props.data.targetId },
    })
  } else if (props.data.kind === 'add' && props.data.parentId !== undefined) {
    createNodeModal.open({ source: 'quickAdd', attachment: { mode: 'add', parentId: props.data.parentId } })
  }
}
</script>

<template>
  <BaseEdge :id="id" :path="path[0]" :marker-end="markerEnd" :style="edgeStyle" />
  <EdgeLabelRenderer v-if="isAddable">
    <div
      :style="buttonStyle"
      class="flex size-5 cursor-pointer items-center justify-center rounded-full bg-white transition-colors"
      :class="hovered ? '' : 'text-gray-400'"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
      @click.stop="handleClick"
    >
      <PlusCircleIcon class="size-4" />
    </div>
  </EdgeLabelRenderer>
</template>
