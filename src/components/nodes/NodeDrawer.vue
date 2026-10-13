<script setup lang="ts">
import { computed, nextTick, onUnmounted, useId, useTemplateRef, watch } from 'vue'
import { ExternalLink, X } from '@lucide/vue'
import { FLOW_NODE_TYPE_LABELS, NODE_TYPE_EDGE_OPTIONS } from '@/types/flow'
import { NODE_ICON_MAP } from '@/components/icons'
import { useFlowStore } from '@/stores/useFlowStore'
import { useNodeDrawer } from '@/composables/useNodeDrawer'
import { Button } from '@/components/ui/button'
import DeleteNodeButton from './DeleteNodeButton.vue'
import NodeDetailsPanel from './NodeDetailsPanel.vue'

const drawer = useNodeDrawer()
const flowStore = useFlowStore()

const node = computed(() => flowStore.nodes.find((candidate) => String(candidate.id) === String(drawer.selectedNodeId.value)))

const titleIcon = computed(() => (node.value && node.value.type !== 'dateTimeConnector' ? NODE_ICON_MAP[node.value.type] : undefined))

const titleIconColor = computed(() => (node.value ? NODE_TYPE_EDGE_OPTIONS[node.value.type].color : undefined))

const titleLabel = computed(() => (node.value ? FLOW_NODE_TYPE_LABELS[node.value.type] : 'Node details'))

const titleId = useId()
const titleRef = useTemplateRef<HTMLHeadingElement>('title')

// Keyboard opens move focus to the heading so it's announced and Tab
// continues into the fields.
watch(drawer.focusRequest, async () => {
  await nextTick()
  titleRef.value?.focus()
})

function handleEscape(event: KeyboardEvent) {
  // Popovers/comboboxes inside the drawer handle their own Escape first.
  if (event.defaultPrevented) return
  drawer.close()
}

function handleMouseMove(startX: number, startWidth: number) {
  return (event: MouseEvent) => {
    drawer.setWidth(startWidth + (startX - event.clientX))
  }
}

let activeMouseMove: ((event: MouseEvent) => void) | undefined
let activeMouseUp: (() => void) | undefined

function stopResize() {
  drawer.setResizing(false)
  if (activeMouseMove) window.removeEventListener('mousemove', activeMouseMove)
  if (activeMouseUp) window.removeEventListener('mouseup', activeMouseUp)
  activeMouseMove = undefined
  activeMouseUp = undefined
}

function startResize(event: MouseEvent) {
  drawer.setResizing(true)
  activeMouseMove = handleMouseMove(event.clientX, drawer.displayWidth.value)
  activeMouseUp = stopResize

  window.addEventListener('mousemove', activeMouseMove)
  window.addEventListener('mouseup', activeMouseUp)
}

onUnmounted(() => {
  stopResize()
})
</script>

<template>
  <aside
    v-if="drawer.selectedNodeId.value !== null"
    class="flex h-full min-w-0 flex-col overflow-y-auto bg-white"
    :class="drawer.isOverlay.value ? 'fixed inset-0 z-40 w-full' : 'relative border-l border-gray-200'"
    :role="drawer.isOverlay.value ? 'dialog' : undefined"
    :aria-modal="drawer.isOverlay.value ? 'true' : undefined"
    :aria-labelledby="titleId"
    @keydown.esc="handleEscape"
  >
    <div
      v-if="!drawer.isOverlay.value"
      class="absolute inset-y-0 left-0 z-10 w-2 -translate-x-1/2 cursor-col-resize touch-none select-none hover:bg-blue-400/30"
      :class="drawer.isResizing.value && 'bg-blue-400/40'"
      @mousedown.prevent="startResize"
    />
    <div class="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
      <h2 :id="titleId" ref="title" tabindex="-1" class="flex items-center gap-1.5 text-sm font-semibold text-gray-900 outline-none">
        <component :is="titleIcon" v-if="titleIcon" class="size-4 shrink-0" :style="{ color: titleIconColor }" />
        {{ titleLabel }}
      </h2>
      <div class="flex items-center gap-1">
        <Button as-child variant="outline" size="sm">
          <a :href="`/node/${drawer.selectedNodeId.value}`" target="_blank" rel="noopener noreferrer">
            Open in new tab
            <ExternalLink />
          </a>
        </Button>
        <Button variant="ghost" size="icon-sm" @click="drawer.close()">
          <X />
          <span class="sr-only">Close</span>
        </Button>
      </div>
    </div>
    <div class="min-w-0 flex-1 overflow-y-auto px-4 pt-8 pb-4">
      <NodeDetailsPanel :node-id="drawer.selectedNodeId.value" :show-footer="false" @deleted="drawer.close()" />
    </div>
    <div v-if="node" class="flex shrink-0 items-center gap-2 border-t border-gray-200 px-4 py-3">
      <DeleteNodeButton :node-id="node.id" @deleted="drawer.close()" />
    </div>
  </aside>
</template>
