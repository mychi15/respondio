import { useQuery } from '@tanstack/vue-query'
import { watch } from 'vue'
import { fetchFlow } from '@/api/flowApi'
import { useFlowStore } from '@/stores/useFlowStore'
import { useToast } from '@/composables/useToast'

/**
 * Fetches the flow and syncs it into the store. Used by both CanvasView and
 * NodeDetailView so a direct load of /node/:nodeId (a shared link, a
 * refresh) populates the store instead of relying on CanvasView having run
 * first in the same SPA session.
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
