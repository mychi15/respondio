<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FlowNode, NodeId } from '@/types/flow'
import { FLOW_NODE_TYPE_LABELS } from '@/types/flow'
import { buildNodeTree } from '@/utils/flowGraph'
import { camelCaseToWords } from '@/utils/helpers'
import { useFlowStore } from '@/stores/useFlowStore'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const modelValue = defineModel<NodeId | null>({ default: null })

const flowStore = useFlowStore()

const treeItems = computed(() => buildNodeTree(flowStore.nodes))

function nodeLabel(node: FlowNode): string {
  if (node.name) return node.name
  if (node.type === 'dateTimeConnector') return camelCaseToWords(node.data.connectorType)
  return FLOW_NODE_TYPE_LABELS[node.type]
}

const selectedLabel = computed(() => {
  const item = treeItems.value.find((entry) => entry.node.id === modelValue.value)
  if (!item) return 'Select parent node'
  return nodeLabel(item.node)
})

const isOpen = ref(false)

function selectNode(nodeId: NodeId) {
  modelValue.value = nodeId
  isOpen.value = false
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button variant="outline" class="w-full justify-start font-normal">
        {{ selectedLabel }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-64 p-1" align="start">
      <ul class="max-h-64 overflow-y-auto">
        <li v-for="item in treeItems" :key="String(item.node.id)">
          <button
            type="button"
            :disabled="!item.selectable"
            :style="{ paddingLeft: `${item.depth * 16 + 8}px` }"
            :class="
              cn(
                'flex w-full items-center rounded-md py-1.5 pr-2 text-left text-xs/relaxed',
                item.selectable ? 'hover:bg-accent cursor-pointer' : 'cursor-not-allowed opacity-50',
                modelValue === item.node.id && 'bg-accent',
              )
            "
            @click="item.selectable && selectNode(item.node.id)"
          >
            {{ nodeLabel(item.node) }}
          </button>
        </li>
      </ul>
    </PopoverContent>
  </Popover>
</template>
