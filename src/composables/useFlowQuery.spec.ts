import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { FLOW_QUERY_KEY } from '@/lib/queryClient'
import { useFlowStore } from '@/stores/useFlowStore'
import { useFlowQuery } from './useFlowQuery'
import mockFlowNodes from '../../api/_fixtures/mockFlow'

function mountWithQuery() {
  const queryClient = new QueryClient()
  mount(defineComponent({ setup: () => useFlowQuery(), template: '<div />' }), {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  })
  return queryClient
}

describe('useFlowQuery', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds the store from the fetched flow', async () => {
    mountWithQuery()
    await flushPromises()

    expect(useFlowStore().nodes.map((node) => node.id)).toEqual(mockFlowNodes.map((node) => node.id))
  })

  it('does not overwrite the store or its undo history when the cache changes after the first load', async () => {
    const queryClient = mountWithQuery()
    await flushPromises()
    const store = useFlowStore()
    store.updateNode(mockFlowNodes[1].id, { name: 'Edited locally' })
    store.persist()
    await flushPromises()

    // e.g. a save from earlier writing an older snapshot back into the cache.
    // It must differ from the cached flow, or structural sharing keeps the old
    // reference and nothing would be notified anyway.
    const olderSnapshot = structuredClone(mockFlowNodes)
    olderSnapshot[1].name = 'Older saved name'
    queryClient.setQueryData(FLOW_QUERY_KEY, olderSnapshot)
    await flushPromises()

    expect(store.nodes.find((node) => node.id === mockFlowNodes[1].id)?.name).toBe('Edited locally')
    expect(store.canUndo).toBe(true)
  })
})
