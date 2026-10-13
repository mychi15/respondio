<script setup lang="ts">
import type { NodeId } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const props = defineProps<{ nodeId: NodeId }>()
const emit = defineEmits<{ deleted: [] }>()

const flowStore = useFlowStore()

function handleDelete() {
  flowStore.deleteNode(props.nodeId)
  emit('deleted')
}
</script>

<template>
  <AlertDialog>
    <AlertDialogTrigger as-child>
      <Button variant="destructive">Delete node</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete this node?</AlertDialogTitle>
        <AlertDialogDescription>
          This removes the node and every downstream descendant. This can't be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction @click="handleDelete">Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
