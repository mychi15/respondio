import { useQuery } from '@tanstack/vue-query'
import { watch } from 'vue'
import { fetchFlow } from '@/api/flowApi'
import { useFlowStore } from '@/stores/useFlowStore'
import { useToast } from '@/composables/useToast'

/**
 * Fetches the flow and syncs it into the store. CanvasView renders both `/`
 * and `/node/:nodeId`, so a direct load of a node link (a shared link, a
 * refresh) loads the flow the same way and then opens that node's drawer.
 */
export function useFlowQuery() {
  const flowStore = useFlowStore()
  const toast = useToast()

  const query = useQuery({
    queryKey: ['flow'],
    queryFn: fetchFlow,
  })

  watch(query.data, (nodes) => {
    if (nodes) flowStore.setNodes(nodes)
  })

  watch(query.isError, (hasError) => {
    if (hasError) toast.show('Failed to load the flow. Please refresh.')
  })

  return query
}
