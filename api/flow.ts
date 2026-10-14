import { Redis } from '@upstash/redis'
import mockFlow from './_fixtures/mockFlow.js'

const DEFAULT_KEY = 'flows/flow.json'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...headers },
  })
}

// True until this function instance serves its first POST, so that save can
// be flagged (via Server-Timing) as having paid the cold-start cost.
let isColdStart = true

/**
 * Builds Server-Timing headers so DevTools (Network → Timing) shows where a
 * request's server time went. Timing-Allow-Origin exposes them to the
 * cross-origin app (localhost or the deployed frontend).
 */
function serverTimingHeaders(durations: Record<string, number>, cold: boolean): Record<string, string> {
  const metrics = Object.entries(durations).map(([name, ms]) => `${name};dur=${ms.toFixed(1)}`)
  if (cold) metrics.push('cold;desc="Cold start"')
  return { 'Server-Timing': metrics.join(', '), 'Timing-Allow-Origin': '*' }
}

// Accepts either the Upstash (UPSTASH_REDIS_REST_*) or the Vercel
// Marketplace (KV_REST_API_*) env var names. Null when neither is set, so
// local runs without credentials fall back to the fixture.
const redis = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL ? Redis.fromEnv() : null

// Each flow is stored as one JSON-serialized node array under its key.
// @upstash/redis serializes on set and parses on get.
async function readFlow(key: string): Promise<unknown[] | null> {
  return redis ? redis.get<unknown[]>(key) : null
}

async function writeFlow(key: string, nodes: unknown[]): Promise<void> {
  if (!redis) throw new Error('Redis is not configured')
  await redis.set(key, nodes)
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key') ?? DEFAULT_KEY

  let existing: unknown[] | null
  try {
    existing = await readFlow(key)
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 502)
  }
  if (existing !== null) return jsonResponse(existing)
  if (!redis) return jsonResponse(mockFlow)

  await writeFlow(key, mockFlow)
  return jsonResponse(mockFlow)
}

export async function POST(request: Request): Promise<Response> {
  const cold = isColdStart
  isColdStart = false
  const start = performance.now()

  const key = new URL(request.url).searchParams.get('key') ?? DEFAULT_KEY
  const body = (await request.json()) as { nodes?: unknown }
  const parsed = performance.now()

  if (!Array.isArray(body.nodes)) {
    return jsonResponse({ error: 'Expected a JSON body of the shape { nodes: FlowNode[] }' }, 400)
  }

  await writeFlow(key, body.nodes)
  const written = performance.now()

  return jsonResponse(
    { ok: true },
    200,
    serverTimingHeaders({ parse: parsed - start, redis: written - parsed, total: written - start }, cold),
  )
}
