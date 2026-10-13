<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import { computed, ref } from 'vue'
import { FLOW_NODE_TYPE_LABELS, NODE_TYPE_EDGE_OPTIONS } from '@/types/flow'
import type { FlowNode } from '@/types/flow'
import { getNodeDescription, isInteractiveNodeType } from '@/utils/flowGraph'
import { NODE_ICON_MAP } from '@/components/icons'
import { CONNECTOR_WIDTH, getNodeHeight, NODE_WIDTH } from '@/utils/flowLayout'

const props = defineProps<NodeProps<FlowNode>>()

const emit = defineEmits<{ click: [nodeId: FlowNode['id']] }>()

const interactive = computed(() => isInteractiveNodeType(props.data.type))

const isConnector = computed(() => props.data.type === 'dateTimeConnector')

const isHovered = ref(false)

const edgeColor = computed(() => NODE_TYPE_EDGE_OPTIONS[props.data.type].color)
const edgeHoverColor = computed(() => NODE_TYPE_EDGE_OPTIONS[props.data.type].hoverColor)

const borderColor = computed(() => (interactive.value && isHovered.value && !props.selected ? edgeHoverColor.value : edgeColor.value))

const iconComponent = computed(() =>
  props.data.type === 'dateTimeConnector' ? undefined : NODE_ICON_MAP[props.data.type],
)

const title = computed(() => {
  if (props.data.name) return props.data.name
  if (props.data.type === 'dateTimeConnector') {
    return props.data.data.connectorType === 'success' ? 'Success' : 'Failure'
  }
  return FLOW_NODE_TYPE_LABELS[props.data.type]
})

const description = computed(() => getNodeDescription(props.data))

const cardClasses = computed(() => [
  'rounded-lg border bg-white shadow-sm overflow-hidden transition-colors',
  interactive.value ? 'cursor-pointer' : 'cursor-default',
])

const cardStyle = computed(() => ({
  width: `${NODE_WIDTH}px`,
  minHeight: `${getNodeHeight(props.data)}px`,
  borderColor: borderColor.value,
  boxShadow: props.selected ? `0 0 0 2px ${edgeColor.value}4D` : undefined,
}))

const connectorClasses = ['rounded-md bg-blue-50 px-3 py-1 text-center text-sm font-semibold text-blue-500']

function handleClick() {
  emit('click', props.data.id)
}
</script>

<template>
  <div v-if="isConnector" :class="connectorClasses" :style="{ width: `${CONNECTOR_WIDTH}px` }">{{ title }}</div>
  <div
    v-else
    :class="cardClasses"
    :style="cardStyle"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    v-on="interactive ? { click: handleClick } : {}"
  >
    <div class="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
      <component :is="iconComponent" class="shrink-0 text-gray-500" />
      <span class="truncate text-sm font-medium text-gray-900">{{ title }}</span>
    </div>
    <p v-if="description" class="line-clamp-3 whitespace-pre-line text-sm text-gray-500 mx-3 my-2">
      {{ description }}
    </p>
  </div>
</template>
