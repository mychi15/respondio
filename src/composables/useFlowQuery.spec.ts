import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { fetchFlow } from '@/api/flowApi'
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
    vi.mocked(fetchFlow).mockClear()
  })

  it('seeds the store from the fetched flow', async () => {
    mountWithQuery()
    await flushPromises()

    expect(useFlowStore().nodes.map((node) => node.id)).toEqual(mockFlowNodes.map((node) => node.id))
    expect(useFlowStore().isSampleData).toBe(false)
  })

  it('falls back to the sample flow when the API cannot be reached, after one retry', async () => {
    vi.mocked(fetchFlow).mockRejectedValueOnce(new Error('Failed to load flow (503)')).mockRejectedValueOnce(new Error('Failed to load flow (503)'))
    mountWithQuery()

    await vi.waitFor(() => expect(useFlowStore().isSampleData).toBe(true), { timeout: 3000 })

    expect(fetchFlow).toHaveBeenCalledTimes(2)
    expect(useFlowStore().nodes.map((node) => node.id)).toEqual(mockFlowNodes.map((node) => node.id))
  })

  it('does not fall back when the retry succeeds', async () => {
    vi.mocked(fetchFlow).mockRejectedValueOnce(new Error('Failed to load flow (503)'))
    mountWithQuery()

    await vi.waitFor(() => expect(useFlowStore().nodes).toHaveLength(mockFlowNodes.length), { timeout: 3000 })

    expect(useFlowStore().isSampleData).toBe(false)
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
