import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import mockFlow from '../api/_fixtures/mockFlow.js'
import { TEST_FLOW_KEY } from './constants.js'

const ATTACHMENT_PATH = fileURLToPath(new URL('./fixtures/test-attachment.png', import.meta.url))

function flowUrl(): string {
  return `${process.env.VITE_API_BASE_URL}/api/flow?key=${encodeURIComponent(TEST_FLOW_KEY)}`
}

interface PersistedNode {
  id: string | number
  name?: string
  position?: { x: number; y: number }
  data: { payload?: Array<{ type: string; text?: string; attachment?: string }> }
}

async function fetchPersistedFlow(): Promise<PersistedNode[]> {
  const res = await fetch(flowUrl())
  if (!res.ok) throw new Error(`Failed to fetch test flow: ${res.status}`)
  return (await res.json()) as PersistedNode[]
}

/**
 * The store persists fire-and-forget (see useFlowStore's `persist()`), so the
 * UI reports success before the network write lands. Poll instead of reading
 * the API once right after a UI action.
 */
async function waitForPersistedFlow(
  predicate: (nodes: PersistedNode[]) => boolean,
  timeoutMs = 20000,
): Promise<PersistedNode[]> {
  const deadline = Date.now() + timeoutMs
  let nodes: PersistedNode[] = []
  let matched = false
  while (!matched && Date.now() < deadline) {
    try {
      nodes = await fetchPersistedFlow()
      matched = predicate(nodes)
    } catch {
      // transient network/5xx against live infra — retry until the deadline
    }
    if (!matched) await new Promise((resolve) => setTimeout(resolve, 300))
  }
  return nodes
}

async function resetTestFlow(): Promise<void> {
  const res = await fetch(flowUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes: mockFlow }),
  })
  if (!res.ok) throw new Error(`Failed to reset test flow: ${res.status}`)

  // Blob writes can lag behind reads for a moment (CDN edge consistency) —
  // confirm the reset actually landed before the test builds on top of it.
  await waitForPersistedFlow((nodes) => nodes.length === mockFlow.length && !nodes.some((n) => n.name?.startsWith('E2E Test Node')))
}

// Every test resets and mutates the same test flow key, so they can't run in
// parallel with each other even though the config is fullyParallel.
test.describe.configure({ mode: 'default' })

test.beforeEach(async () => {
  await resetTestFlow()
})

test('golden path: load, create, edit, upload, type-specific edit, delete (cascade)', async ({ page }) => {
  test.setTimeout(120000) // real network round trips (deployed API, real Blob store), not mocked

  await page.goto('/')
  await page.getByText('Loading flow…').waitFor({ state: 'hidden' })

  // Sanity check: the fixture reset actually took effect before we build on top of it.
  await expect(page.getByText('E2E Test Node', { exact: true })).toHaveCount(0)

  // Create a new Send Message node as a child of the existing "After-hours message"
  // node (childless in the fixture — every node type but dateTime caps at one child).
  await page.getByRole('button', { name: 'Create New Node' }).click()
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Send Message' }).click()
  await page.getByLabel('Title').fill('E2E Test Node')
  await page.getByLabel('Description').fill('Created by the e2e golden path test.')
  await page.getByRole('button', { name: 'Select parent node' }).click()
  const parentOption = page.getByRole('button', { name: 'After-hours message', exact: true })
  await expect(parentOption).toBeEnabled()
  await parentOption.click()
  await page.getByRole('button', { name: 'Create', exact: true }).click()

  await expect(page.getByText('E2E Test Node', { exact: true })).toBeVisible()

  // Open the drawer and edit title/description.
  await page.getByText('E2E Test Node', { exact: true }).click()
  await page.getByLabel('Title').fill('E2E Test Node (edited)')
  await page.getByLabel('Description').fill('Edited by the e2e golden path test.')

  // Upload a real attachment via the client-upload flow.
  await page.locator('input[type="file"]').setInputFiles(ATTACHMENT_PATH)
  await page.getByAltText('Attachment preview').waitFor({ state: 'visible', timeout: 15000 })

  // Edit the type-specific field (message text).
  await page.getByPlaceholder('Optional message text').fill('Updated via e2e test.')

  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Changes saved')).toBeVisible()
  await expect(page.getByText('E2E Test Node (edited)', { exact: true })).toBeVisible()

  const afterSave = await waitForPersistedFlow((nodes) => nodes.some((node) => node.name === 'E2E Test Node (edited)'))
  const savedNode = afterSave.find((node) => node.name === 'E2E Test Node (edited)')
  expect(savedNode).toBeDefined()
  expect(savedNode!.data.payload?.some((item) => item.type === 'text' && item.text === 'Updated via e2e test.')).toBe(true)
  const attachment = savedNode!.data.payload?.find((item) => item.type === 'attachment')
  expect(attachment?.attachment).toMatch(/^https:\/\/.*test-attachment.*\.png$/)

  // Delete the node (with cascade confirmation).
  await page.getByRole('button', { name: 'Delete node' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()

  await expect(page.getByText('E2E Test Node (edited)', { exact: true })).toHaveCount(0)

  const afterDelete = await waitForPersistedFlow((nodes) => !nodes.some((node) => node.name === 'E2E Test Node (edited)'))
  expect(afterDelete.some((node) => node.name === 'E2E Test Node (edited)')).toBe(false)
  expect(afterDelete).toHaveLength(mockFlow.length)
})

test('keyboard: open the drawer from a node, close it with Escape, and move the node', async ({ page }) => {
  test.setTimeout(60000)

  await page.goto('/')
  await page.getByText('Loading flow…').waitFor({ state: 'hidden' })

  const node = page.getByRole('group', { name: 'Send Message: Welcome message' })
  await node.focus()
  await expect(node).toBeFocused()

  await page.keyboard.press('Enter')
  const heading = page.getByRole('complementary', { name: 'Send Message' }).getByRole('heading')
  await expect(heading).toBeFocused()
  const welcomeId = mockFlow.find((candidate) => candidate.name === 'Welcome message')!.id
  await expect(page).toHaveURL(`/node/${welcomeId}`)

  await page.keyboard.press('Escape')
  await expect(page.getByRole('complementary')).toHaveCount(0)
  await expect(page).toHaveURL('/')
  await expect(node).toBeFocused()

  // Edge "+" buttons are real buttons: reachable, labelled, and open the create modal.
  const addButton = page.getByRole('button', { name: 'Add node after After-hours message' })
  await addButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(addButton).toBeFocused()

  // Vue Flow only arrow-moves a selected node; opening selects it, then move
  // with focus back on the node. The fixture has no stored positions, so any
  // persisted position means the keyboard move was saved.
  const nodeId = mockFlow.find((candidate) => candidate.name === 'Welcome message')!.id
  await node.focus()
  await page.keyboard.press('Enter')
  await node.focus()
  await page.keyboard.press('ArrowRight')

  const persisted = await waitForPersistedFlow((nodes) => nodes.find((candidate) => candidate.id === nodeId)?.position !== undefined)
  expect(persisted.find((candidate) => candidate.id === nodeId)?.position).toBeDefined()
})

test('deep link: a /node/:nodeId URL opens the canvas with that node\'s drawer', async ({ page }) => {
  test.setTimeout(60000)
  const welcome = mockFlow.find((candidate) => candidate.name === 'Welcome message')!

  await page.goto(`/node/${welcome.id}`)
  const drawer = page.getByRole('complementary', { name: 'Send Message' })
  await expect(drawer.getByLabel('Title')).toHaveValue('Welcome message')
  await expect(page.getByRole('group', { name: 'Send Message: Welcome message' })).toBeVisible()

  // A refresh keeps the drawer open.
  await page.reload()
  await expect(drawer.getByLabel('Title')).toHaveValue('Welcome message')

  // An unknown node id closes the drawer and lands on the canvas.
  await page.goto('/node/doesnotexist')
  await expect(page.getByText('That node no longer exists.')).toBeVisible()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('complementary')).toHaveCount(0)
})
