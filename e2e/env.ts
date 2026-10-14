import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Playwright's Node process doesn't get Vite's automatic .env.local loading,
 * but e2e needs VITE_API_BASE_URL to reset the test flow key via plain fetch
 * (outside the browser) and to pass VITE_FLOW_KEY through to the spawned dev
 * server. Parses the same file Vite reads, without adding a dotenv dependency.
 */
export function loadEnvLocal(): void {
  const path = fileURLToPath(new URL('../.env.local', import.meta.url))
  let contents: string
  try {
    contents = readFileSync(path, 'utf-8')
  } catch {
    return
  }

  for (const line of contents.split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key] !== undefined) continue
    process.env[key] = rawValue.replace(/^["']|["']$/g, '')
  }
}
