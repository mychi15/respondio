import { put } from '@vercel/blob'
import mockFlow from './_fixtures/mockFlow.json' with { type: 'json' };

export const config = { runtime: 'edge' }

const DEFAULT_KEY = 'flows/flow.json'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function blobUrl(key: string): string | null {
  return process.env.BLOB_BASE_URL ? `${process.env.BLOB_BASE_URL}/${key}` : null
}

/**
 * Returns the blob's content, or null if no blob exists at `key` (safe for
 * the caller to seed). A blob that exists but can't be read right now (CDN
 * edge inconsistency right after an overwrite, occasionally serving an HTML
 * error page instead of the JSON body) throws instead of returning null —
 * conflating the two would make a transient read glitch overwrite real data
 * with the fixture.
 */
async function readBlob(key: string): Promise<string | null> {
  const url = blobUrl(key)
  if (!url) return null

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 150 * attempt))

    const res = await fetch(url, { cache: 'no-store' })
    if (res.status === 404) return null
    if (!res.ok) continue

    const text = await res.text()
    try {
      JSON.parse(text)
      return text
    } catch {
      // Retry — likely an HTML error page served instead of the JSON body.
    }
  }

  throw new Error(`Blob exists at "${key}" but could not be read as JSON after retries`)
}

async function writeBlob(key: string, body: string): Promise<void> {
  await put(key, body, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key') ?? DEFAULT_KEY

  let existing: string | null
  try {
    existing = await readBlob(key)
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 502)
  }
  if (existing !== null) return jsonResponse(JSON.parse(existing))
  if (!blobUrl(key)) return jsonResponse(mockFlow)

  await writeBlob(key, JSON.stringify(mockFlow))
  return jsonResponse(mockFlow)
}

export async function POST(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get('key') ?? DEFAULT_KEY
  const body = (await request.json()) as { nodes?: unknown }

  if (!Array.isArray(body.nodes)) {
    return jsonResponse({ error: 'Expected a JSON body of the shape { nodes: FlowNode[] }' }, 400)
  }

  await writeBlob(key, JSON.stringify(body.nodes))
  return jsonResponse({ ok: true })
}
