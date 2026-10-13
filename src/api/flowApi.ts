import type { FlowNode } from '@/types/flow'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://respondio-eosin.vercel.app'

const FLOW_KEY = import.meta.env.VITE_FLOW_KEY ?? 'flows/flow.json'

function flowUrl(): string {
  return `${API_BASE_URL}/api/flow?key=${encodeURIComponent(FLOW_KEY)}`
}

export async function fetchFlow(): Promise<FlowNode[]> {
  const res = await fetch(flowUrl())
  if (!res.ok) throw new Error(`Failed to load flow (${res.status})`)
  return res.json()
}

export async function saveFlow(nodes: FlowNode[]): Promise<void> {
  const res = await fetch(flowUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes }),
  })
  if (!res.ok) throw new Error(`Failed to save flow (${res.status})`)
}
