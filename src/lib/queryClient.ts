import { QueryClient } from '@tanstack/vue-query'

export const FLOW_QUERY_KEY = ['flow'] as const

/**
 * One client for the whole app. VueQueryPlugin provides it to components, and
 * useFlowStore passes it to useMutation directly: a Pinia store isn't a
 * component, so it can't rely on the plugin's injection. Sharing it means the
 * save mutation updates the same cache useFlowQuery reads from.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      networkMode: 'always',
      staleTime: Infinity,
      gcTime: 60 * 60 * 1000,
    },
    mutations: {
      networkMode: 'always',
    },
  },
})
