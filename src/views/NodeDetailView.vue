<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NodeDetailsPanel from '@/components/nodes/NodeDetailsPanel.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import { Button } from '@/components/ui/button'
import { Loader2 } from '@lucide/vue'
import { useFlowQuery } from '@/composables/useFlowQuery'

const route = useRoute()
const router = useRouter()

const { isPending, isError } = useFlowQuery()

const nodeId = computed(() => route.params.nodeId as string)

function handleDeleted() {
  router.push('/')
}
</script>

<template>
  <div class="mx-auto flex max-w-xl flex-col gap-4 p-6">
    <Button as-child variant="outline" class="self-start">
      <router-link to="/">View canvas</router-link>
    </Button>

    <div v-if="isPending" class="flex items-center justify-center py-12 text-gray-500">
      <Loader2 class="size-5 animate-spin" />
    </div>
    <p v-else-if="isError" class="py-12 text-center text-gray-500">No node found</p>
    <NodeDetailsPanel v-else :node-id="nodeId" @deleted="handleDeleted" />
  </div>
  <div class="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center">
    <ToastNotification />
  </div>
</template>
