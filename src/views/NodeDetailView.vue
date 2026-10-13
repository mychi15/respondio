<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NodeDetailsPanel from '@/components/nodes/NodeDetailsPanel.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import { Button } from '@/components/ui/button'

const route = useRoute()
const router = useRouter()

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

    <NodeDetailsPanel :node-id="nodeId" @deleted="handleDeleted" />
  </div>
  <div class="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center">
    <ToastNotification />
  </div>
</template>
