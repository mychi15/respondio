import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveFlow } from '@/api/flowApi'
import { computeNodePositions, DEFAULT_VERTICAL_SPACING, getNodeHeight, HORIZONTAL_SPACING, positionBelow } from '@/utils/flowLayout'
import { useToast } from '@/composables/useToast'
import { FLOW_QUERY_KEY, queryClient } from '@/lib/queryClient'
import { useFlowStore } from './useFlowStore'
import mockFlowNodes from '../../api/_fixtures/mockFlow'

describe('useFlowStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useFlowStore().setNodes(mockFlowNodes)
  })

  it('derives vueFlowNodes with the same length as the sample nodes', () => {
    const store = useFlowStore()
    expect(store.vueFlowNodes).toHaveLength(mockFlowNodes.length)
  })

  it('derives vueFlowEdges with one fewer entry than nodes (root has no edge)', () => {
    const store = useFlowStore()
    expect(store.vueFlowEdges).toHaveLength(mockFlowNodes.length - 1)
  })

  it('marks the trigger node as unselectable', () => {
    const store = useFlowStore()
    const trigger = store.vueFlowNodes.find((node) => node.id === 'a1b2c3')
    expect(trigger?.selectable).toBe(false)
  })

  it('exposes an add-node placeholder + dashed edge for every leaf node', () => {
    const store = useFlowStore()
    const leaves = store.nodes.filter(
      (node) => !store.nodes.some((candidate) => candidate.parentId === node.id),
    )
    expect(store.addNodePlaceholders.nodes).toHaveLength(leaves.length)
    expect(store.addNodePlaceholders.edges).toHaveLength(leaves.length)
  })

  it('createNode with mode "add" appends a new node parented to the given node', () => {
    const store = useFlowStore()
    const before = store.nodes.length
    store.createNode({ name: 'New Step', type: 'sendMessage' }, { mode: 'add', parentId: 'b7c8d9' })

    expect(store.nodes).toHaveLength(before + 1)
    const added = store.nodes.at(-1)!
    expect(added.parentId).toBe('b7c8d9')
    expect(added.id).toMatch(/^[0-9a-f]{6}$/)
  })

  it('createNode with mode "insert" splices a new node between the source and target', () => {
    const store = useFlowStore()
    const before = store.nodes.length
    store.createNode({ name: 'New Step', type: 'sendMessage' }, { mode: 'insert', sourceId: 'b7c8d9', targetId: 'f3a4b5' })

    expect(store.nodes).toHaveLength(before + 1)
    const target = store.nodes.find((node) => node.id === 'f3a4b5')!
    const inserted = store.nodes.at(-1)!
    expect(target.parentId).toBe(inserted.id)
    expect(inserted.parentId).toBe('b7c8d9')
  })

  it('createNode "insert" for "dateTime" re-attaches the target under the success connector', () => {
    const store = useFlowStore()
    const created = store.createNode({ name: 'Hours', type: 'dateTime' }, { mode: 'insert', sourceId: 'b7c8d9', targetId: 'f3a4b5' })
    if (created.type !== 'dateTime') throw new Error('expected a dateTime node')

    const children = store.nodes.filter((node) => node.parentId === created.id)
    expect(children.map((node) => node.type)).toEqual(['dateTimeConnector', 'dateTimeConnector'])

    const [successId] = created.data.connectors
    expect(store.nodes.find((node) => node.id === 'f3a4b5')!.parentId).toBe(successId)
  })

  it('createNode with mode "root" appends an independent trigger root with no name', () => {
    const store = useFlowStore()
    const before = store.nodes.length
    const created = store.createNode({ type: 'trigger' }, { mode: 'root' })

    expect(store.nodes).toHaveLength(before + 1)
    expect(created.parentId).toBe(-1)
    expect(created.type).toBe('trigger')
    expect(created.name).toBeUndefined()
  })

  it.each([
    ['sendMessage', { payload: [] }],
    ['addComment', { comment: '' }],
  ] as const)('createNode fills in the default data shape for type "%s"', (type, expectedData) => {
    const store = useFlowStore()
    const created = store.createNode({ name: 'New Node', type }, { mode: 'add', parentId: 'a1b2c3' })
    expect(created.data).toEqual(expectedData)
  })

  it('createNode for type "dateTime" auto-creates success/failure connector children', () => {
    const store = useFlowStore()
    const before = store.nodes.length
    const created = store.createNode({ name: 'New Node', type: 'dateTime' }, { mode: 'add', parentId: 'a1b2c3' })

    expect(store.nodes).toHaveLength(before + 3)

    const connectors = store.nodes.filter((node) => node.parentId === created.id)
    expect(connectors).toHaveLength(2)
    expect(connectors.map((node) => node.type)).toEqual(['dateTimeConnector', 'dateTimeConnector'])
    expect(connectors.map((node) => (node as { data: { connectorType: string } }).data.connectorType)).toEqual([
      'success',
      'failure',
    ])

    expect(created.data).toEqual({
      times: [],
      timezone: 'UTC',
      action: 'businessHours',
      connectors: connectors.map((node) => node.id),
    })
  })

  it('updateNode merges the given patch into the matching node', () => {
    const store = useFlowStore()
    store.updateNode('f3a4b5', { name: 'Renamed', description: 'New description' })

    const updated = store.nodes.find((node) => node.id === 'f3a4b5')!
    expect(updated.name).toBe('Renamed')
    expect(updated.description).toBe('New description')
  })

  it('updateNode does nothing when the node id does not exist', () => {
    const store = useFlowStore()
    const before = JSON.parse(JSON.stringify(store.nodes))
    store.updateNode('does-not-exist', { name: 'Renamed' })

    expect(JSON.parse(JSON.stringify(store.nodes))).toEqual(before)
  })

  it('deleteNode removes the node and every downstream descendant, including connector branches', () => {
    const store = useFlowStore()
    // Tree: a1b2c3 -> d4e5f6 -> {b7c8d9, e0f1a2}; b7c8d9 -> f3a4b5 -> a9b0c1; e0f1a2 -> c6d7e8
    store.deleteNode('d4e5f6')

    expect(store.nodes.map((node) => node.id)).toEqual(['a1b2c3'])
  })

  it('deleteNode on a leaf only removes that node', () => {
    const store = useFlowStore()
    const before = store.nodes.length
    store.deleteNode('a9b0c1')

    expect(store.nodes).toHaveLength(before - 1)
    expect(store.nodes.some((node) => node.id === 'a9b0c1')).toBe(false)
  })
})

describe('useFlowStore positions and history', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(saveFlow).mockClear()
  })

  function loadedStore() {
    const store = useFlowStore()
    store.setNodes(mockFlowNodes)
    return store
  }

  function byId(store: ReturnType<typeof useFlowStore>, id: string | number) {
    return store.nodes.find((node) => node.id === id)!
  }

  it('setNodes backfills missing positions from auto-layout', () => {
    const store = loadedStore()
    const expected = computeNodePositions(mockFlowNodes)
    for (const node of store.nodes) expect(node.position).toEqual(expected.get(node.id))
  })

  it('setNodes keeps stored positions and starts with an empty history', () => {
    const store = useFlowStore()
    store.setNodes(mockFlowNodes.map((node) => ({ ...node, position: { x: 1, y: 2 } })))

    expect(store.nodes.every((node) => node.position!.x === 1 && node.position!.y === 2)).toBe(true)
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)
  })

  it('createNode "add" places the new node below its parent without moving other nodes', () => {
    const store = loadedStore()
    const before = JSON.parse(JSON.stringify(store.nodes))
    const created = store.createNode({ name: 'New', type: 'addComment' }, { mode: 'add', parentId: 'a9b0c1' })
    const parent = byId(store, 'a9b0c1')

    expect(created.position).toEqual({
      x: parent.position!.x,
      y: parent.position!.y + getNodeHeight(parent) / 2 + DEFAULT_VERTICAL_SPACING + getNodeHeight(created) / 2,
    })
    expect(JSON.parse(JSON.stringify(store.nodes.slice(0, -1)))).toEqual(before)
  })

  it('createNode "insert" takes the target slot and shifts the target subtree down', () => {
    const store = loadedStore()
    const target = byId(store, 'f3a4b5')
    const targetBefore = { ...target.position! }
    const descendantBefore = { ...byId(store, 'a9b0c1').position! }
    const siblingBefore = { ...byId(store, 'c6d7e8').position! }

    const created = store.createNode({ name: 'New', type: 'addComment' }, { mode: 'insert', sourceId: 'b7c8d9', targetId: 'f3a4b5' })
    const dy = getNodeHeight(created) + DEFAULT_VERTICAL_SPACING

    expect(created.position!.x).toBe(targetBefore.x)
    expect(created.position!.y - getNodeHeight(created) / 2).toBe(targetBefore.y - getNodeHeight(target) / 2)
    expect(byId(store, 'f3a4b5').position).toEqual({ x: targetBefore.x, y: targetBefore.y + dy })
    expect(byId(store, 'a9b0c1').position).toEqual({ x: descendantBefore.x, y: descendantBefore.y + dy })
    expect(byId(store, 'c6d7e8').position).toEqual(siblingBefore)
  })

  it('createNode "insert" for "dateTime" moves the target subtree under the success connector', () => {
    const store = loadedStore()
    const created = store.createNode({ name: 'Hours', type: 'dateTime' }, { mode: 'insert', sourceId: 'b7c8d9', targetId: 'f3a4b5' })
    if (created.type !== 'dateTime') throw new Error('expected a dateTime node')

    const success = byId(store, created.data.connectors[0])
    const target = byId(store, 'f3a4b5')
    expect(target.position).toEqual(positionBelow(success, target))
  })

  it('createNode "root" places a new trigger to the right of every node', () => {
    const store = loadedStore()
    const maxX = Math.max(...store.nodes.map((node) => node.position!.x))
    const created = store.createNode({ type: 'trigger' }, { mode: 'root' })

    expect(created.position).toEqual({ x: maxX + HORIZONTAL_SPACING, y: 0 })
  })

  it('createNode "root" on an empty flow places the trigger at the origin', () => {
    const store = useFlowStore()
    const created = store.createNode({ type: 'trigger' }, { mode: 'root' })
    expect(created.position).toEqual({ x: 0, y: 0 })
  })

  it('createNode for "dateTime" places its connectors below it, either side', () => {
    const store = loadedStore()
    const created = store.createNode({ name: 'Hours', type: 'dateTime' }, { mode: 'add', parentId: 'a9b0c1' })
    const [success, failure] = store.nodes.slice(-2)

    expect(success.position!.x).toBe(created.position!.x - HORIZONTAL_SPACING / 2)
    expect(failure.position!.x).toBe(created.position!.x + HORIZONTAL_SPACING / 2)
    expect(success.position!.y).toBeGreaterThan(created.position!.y)
  })

  it('moveNodes stores the new positions and persists once', async () => {
    const store = loadedStore()
    store.moveNodes([
      { id: 'f3a4b5', position: { x: 5, y: 6 } },
      { id: 'c6d7e8', position: { x: 7, y: 8 } },
    ])

    expect(byId(store, 'f3a4b5').position).toEqual({ x: 5, y: 6 })
    expect(byId(store, 'c6d7e8').position).toEqual({ x: 7, y: 8 })
    await vi.waitFor(() => expect(saveFlow).toHaveBeenCalledTimes(1))
  })

  it('moveNodes does nothing when no position changed', () => {
    const store = loadedStore()
    const node = byId(store, 'f3a4b5')
    store.moveNodes([{ id: node.id, position: { ...node.position! } }])

    expect(saveFlow).not.toHaveBeenCalled()
    expect(store.canUndo).toBe(false)
  })

  it('undo/redo round-trips a details edit and saves each time', async () => {
    const store = loadedStore()
    store.updateNode('f3a4b5', { name: 'Renamed' })
    store.persist()

    store.undo()
    expect(byId(store, 'f3a4b5').name).toBe(mockFlowNodes.find((node) => node.id === 'f3a4b5')!.name)
    expect(store.canRedo).toBe(true)

    store.redo()
    expect(byId(store, 'f3a4b5').name).toBe('Renamed')
    await vi.waitFor(() => expect(saveFlow).toHaveBeenCalledTimes(3))
  })

  it('undo restores a deleted subtree', () => {
    const store = loadedStore()
    store.deleteNode('d4e5f6')
    expect(store.nodes).toHaveLength(1)

    store.undo()
    expect(store.nodes.map((node) => node.id)).toEqual(mockFlowNodes.map((node) => node.id))
  })

  it('undo removes a created node', () => {
    const store = loadedStore()
    store.createNode({ name: 'New', type: 'addComment' }, { mode: 'add', parentId: 'a9b0c1' })

    store.undo()
    expect(store.nodes).toHaveLength(mockFlowNodes.length)
  })

  it('undo reverts a drag and an auto-align', () => {
    const store = loadedStore()
    const original = { ...byId(store, 'f3a4b5').position! }

    store.moveNodes([{ id: 'f3a4b5', position: { x: 5, y: 6 } }])
    store.autoAlign()
    expect(byId(store, 'f3a4b5').position).toEqual(original)

    store.undo()
    expect(byId(store, 'f3a4b5').position).toEqual({ x: 5, y: 6 })
    store.undo()
    expect(byId(store, 'f3a4b5').position).toEqual(original)
  })

  it('a new change clears the redo stack', () => {
    const store = loadedStore()
    store.moveNodes([{ id: 'f3a4b5', position: { x: 5, y: 6 } }])
    store.undo()
    expect(store.canRedo).toBe(true)

    store.moveNodes([{ id: 'c6d7e8', position: { x: 7, y: 8 } }])
    expect(store.canRedo).toBe(false)
  })

  it('persist without changes adds no history entry', () => {
    const store = loadedStore()
    store.persist()
    expect(store.canUndo).toBe(false)
  })

  it('undo and redo do nothing when there is no history', () => {
    const store = loadedStore()
    store.undo()
    store.redo()
    expect(saveFlow).not.toHaveBeenCalled()
  })

  it('setNodes resets the history', () => {
    const store = loadedStore()
    store.moveNodes([{ id: 'f3a4b5', position: { x: 5, y: 6 } }])
    store.setNodes(mockFlowNodes)
    expect(store.canUndo).toBe(false)
  })
})

describe('useFlowStore saving through the Query mutation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(saveFlow).mockClear()
    queryClient.clear()
  })

  function loadedStore() {
    const store = useFlowStore()
    store.setNodes(mockFlowNodes)
    return store
  }

  it('saves the flow and writes the saved copy into the flow query cache', async () => {
    const store = loadedStore()
    store.updateNode(mockFlowNodes[1].id, { name: 'Renamed' })

    await store.persist()

    expect(saveFlow).toHaveBeenCalledTimes(1)
    const cached = queryClient.getQueryData<typeof mockFlowNodes>(FLOW_QUERY_KEY)
    expect(cached?.find((node) => node.id === mockFlowNodes[1].id)?.name).toBe('Renamed')
    expect(queryClient.getMutationCache().findAll({ mutationKey: [...FLOW_QUERY_KEY, 'save'] })).toHaveLength(1)
  })

  it('runs saves one at a time, each sending the flow as it was when it was made', async () => {
    let finishFirst!: () => void
    vi.mocked(saveFlow).mockImplementationOnce(() => new Promise<void>((resolve) => (finishFirst = resolve)))
    const store = loadedStore()
    const id = mockFlowNodes[1].id

    store.updateNode(id, { name: 'First' })
    const first = store.persist()
    store.updateNode(id, { name: 'Second' })
    const second = store.persist()

    await vi.waitFor(() => expect(saveFlow).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(saveFlow).toHaveBeenCalledTimes(1)

    finishFirst()
    await Promise.all([first, second])

    const sentNames = vi.mocked(saveFlow).mock.calls.map(([nodes]) => nodes.find((node) => node.id === id)?.name)
    expect(sentNames).toEqual(['First', 'Second'])
  })

  it('shows a toast and rejects persist() when a save fails, without touching the cache', async () => {
    vi.mocked(saveFlow).mockRejectedValueOnce(new Error('Failed to save flow (500)'))
    const store = loadedStore()
    store.updateNode(mockFlowNodes[1].id, { name: 'Renamed' })

    await expect(store.persist()).rejects.toThrow('Failed to save flow (500)')

    expect(useToast().message.value).toBe('Failed to save changes. Please try again.')
    expect(queryClient.getQueryData(FLOW_QUERY_KEY)).toBeUndefined()
  })

  it('keeps going after a failed save', async () => {
    vi.mocked(saveFlow).mockRejectedValueOnce(new Error('Failed to save flow (500)'))
    const store = loadedStore()

    store.updateNode(mockFlowNodes[1].id, { name: 'Lost' })
    await store.persist().catch(() => {})
    store.updateNode(mockFlowNodes[1].id, { name: 'Kept' })
    await store.persist()

    expect(saveFlow).toHaveBeenCalledTimes(2)
    expect(queryClient.getQueryData<typeof mockFlowNodes>(FLOW_QUERY_KEY)?.find((node) => node.id === mockFlowNodes[1].id)?.name).toBe('Kept')
  })
})

describe('useFlowStore with the sample flow loaded', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(saveFlow).mockClear()
  })

  it('marks the flow as sample data and starts with an empty history', () => {
    const store = useFlowStore()
    store.loadSampleFlow(mockFlowNodes)

    expect(store.isSampleData).toBe(true)
    expect(store.nodes).toHaveLength(mockFlowNodes.length)
    expect(store.canUndo).toBe(false)
  })

  it('keeps edits and undo working but sends nothing to the server', async () => {
    const store = useFlowStore()
    store.loadSampleFlow(mockFlowNodes)
    store.updateNode(mockFlowNodes[1].id, { name: 'Offline edit' })

    await store.persist()
    store.deleteNode(mockFlowNodes[1].id)
    store.undo()

    expect(saveFlow).not.toHaveBeenCalled()
    expect(store.nodes.find((node) => node.id === mockFlowNodes[1].id)?.name).toBe('Offline edit')
  })

  it('does not change the bundled sample flow when it is edited', () => {
    const store = useFlowStore()
    const originalName = mockFlowNodes[1].name
    store.loadSampleFlow(mockFlowNodes)

    store.updateNode(mockFlowNodes[1].id, { name: 'Offline edit' })

    expect(mockFlowNodes[1].name).toBe(originalName)
  })

  it('leaves sample mode when a real flow is loaded', () => {
    const store = useFlowStore()
    store.loadSampleFlow(mockFlowNodes)

    store.setNodes(mockFlowNodes)

    expect(store.isSampleData).toBe(false)
  })
})
