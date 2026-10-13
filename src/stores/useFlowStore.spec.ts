import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveFlow } from '@/api/flowApi'
import { computeNodePositions, DEFAULT_VERTICAL_SPACING, getNodeHeight, HORIZONTAL_SPACING } from '@/utils/flowLayout'
import { useFlowStore } from './useFlowStore'
import mockFlowNodes from '../../api/_fixtures/mockFlow'

describe('useFlowStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
    const trigger = store.vueFlowNodes.find((node) => node.id === '1')
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
    store.createNode({ name: 'New Step', type: 'sendMessage' }, { mode: 'add', parentId: '4' })

    expect(store.nodes).toHaveLength(before + 1)
    const added = store.nodes.at(-1)!
    expect(added.parentId).toBe('4')
    expect(added.id).toMatch(/^[0-9a-f]{6}$/)
  })

  it('createNode with mode "insert" splices a new node between the source and target', () => {
    const store = useFlowStore()
    const before = store.nodes.length
    store.createNode({ name: 'New Step', type: 'sendMessage' }, { mode: 'insert', sourceId: 1, targetId: 2 })

    expect(store.nodes).toHaveLength(before + 1)
    const target = store.nodes.find((node) => node.id === 2)!
    const inserted = store.nodes.at(-1)!
    expect(target.parentId).toBe(inserted.id)
    expect(inserted.parentId).toBe(1)
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
    const created = store.createNode({ name: 'New Node', type }, { mode: 'add', parentId: 1 })
    expect(created.data).toEqual(expectedData)
  })

  it('createNode for type "dateTime" auto-creates success/failure connector children', () => {
    const store = useFlowStore()
    const before = store.nodes.length
    const created = store.createNode({ name: 'New Node', type: 'dateTime' }, { mode: 'add', parentId: 1 })

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
    store.updateNode(2, { name: 'Renamed', description: 'New description' })

    const updated = store.nodes.find((node) => node.id === 2)!
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
    // Tree: 1 -> 3 -> {4, 5}; 4 -> 2 -> 6
    store.deleteNode(3)

    expect(store.nodes.map((node) => node.id)).toEqual([1])
  })

  it('deleteNode on a leaf only removes that node', () => {
    const store = useFlowStore()
    const before = store.nodes.length
    store.deleteNode(6)

    expect(store.nodes).toHaveLength(before - 1)
    expect(store.nodes.some((node) => node.id === 6)).toBe(false)
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
