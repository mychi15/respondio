import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useFlowStore } from './useFlowStore'
import { sampleFlowNodes } from './sampleFlow'

describe('useFlowStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('derives vueFlowNodes with the same length as the sample nodes', () => {
    const store = useFlowStore()
    expect(store.vueFlowNodes).toHaveLength(sampleFlowNodes.length)
  })

  it('derives vueFlowEdges with one fewer entry than nodes (root has no edge)', () => {
    const store = useFlowStore()
    expect(store.vueFlowEdges).toHaveLength(sampleFlowNodes.length - 1)
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
    ['dateTime', { times: [], connectors: [], timezone: 'UTC', action: 'businessHours' }],
  ] as const)('createNode fills in the default data shape for type "%s"', (type, expectedData) => {
    const store = useFlowStore()
    const created = store.createNode({ name: 'New Node', type }, { mode: 'add', parentId: 1 })
    expect(created.data).toEqual(expectedData)
  })
})
