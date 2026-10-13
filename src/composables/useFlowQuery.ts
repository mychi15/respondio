import { useQuery } from '@tanstack/vue-query'
import { watch } from 'vue'
import { fetchFlow } from '@/api/flowApi'
import { useFlowStore } from '@/stores/useFlowStore'
import { FLOW_QUERY_KEY } from '@/lib/queryClient'
import mockFlow from '../../api/_fixtures/mockFlow'

/**
 * Fetches the flow and syncs it into the store. CanvasView renders both `/`
 * and `/node/:nodeId`, so a direct load of a node link (a shared link, a
 * refresh) loads the flow the same way and then opens that node's drawer.
 */
export function useFlowQuery() {
  const flowStore = useFlowStore()

  const query = useQuery({
    queryKey: FLOW_QUERY_KEY,
    queryFn: fetchFlow,
    retry: 1,
  })

  // Seeds the store from the first successful load only. After that the
  // store's working copy leads, and the save mutation writes each saved
  // snapshot back into this cache; re-seeding on those updates would reset
  // undo history and could overwrite edits made while a save was in flight.
  watch(
    query.data,
    (nodes) => {
      if (nodes) flowStore.setNodes(nodes)
    },
    { once: true },
  )

  watch(query.isError, (hasError) => {
    if (hasError) flowStore.loadSampleFlow(mockFlow)
  })

  return query
}
