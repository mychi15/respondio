import type { FlowNode, NodeId } from '@/types/flow'

export const NODE_WIDTH = 200

export const CONNECTOR_WIDTH = 96

export const NODE_HEIGHT = 72

export const CONNECTOR_HEIGHT = 32

export const NODE_WITH_DESCRIPTION_HEIGHT = 140

const DEFAULT_HORIZONTAL_GAP = 80

export const HORIZONTAL_SPACING = NODE_WIDTH + DEFAULT_HORIZONTAL_GAP

export const DEFAULT_VERTICAL_SPACING = 100

export interface FlowPosition {
  x: number
  y: number
}

export function getNodeWidth(node: FlowNode): number {
  return node.type === 'dateTimeConnector' ? CONNECTOR_WIDTH : NODE_WIDTH
}

/**
 * Whether a node's description can grow to multiple wrapped lines (free-form
 * text: an explicit override, or a sendMessage preview), as opposed to the
 * short, fixed-format single-line text auto-generated for dateTime/trigger.
 * Only this kind of description needs the taller NODE_WITH_DESCRIPTION_HEIGHT
 * reserved for it.
 */
export function hasVariableLengthDescription(node: FlowNode): boolean {
  if (node.description) return true
  return node.type === 'sendMessage' && Boolean(node.data.payload?.length) || Boolean(node.type === 'addComment' && node.data.comment)
}

export function getNodeHeight(node: FlowNode): number {
  if (node.type === 'dateTimeConnector') return CONNECTOR_HEIGHT
  return hasVariableLengthDescription(node) ? NODE_WITH_DESCRIPTION_HEIGHT : NODE_HEIGHT
}

export function groupChildrenByParent(nodes: FlowNode[]): Map<NodeId, FlowNode[]> {
  const childrenByParent = new Map<NodeId, FlowNode[]>()
  for (const node of nodes) {
    const siblings = childrenByParent.get(node.parentId) ?? []
    siblings.push(node)
    childrenByParent.set(node.parentId, siblings)
  }
  return childrenByParent
}

export interface NodeTraversalEntry {
  node: FlowNode
  depth: number
}

/**
 * Pre-order depth-first walk: every node is immediately followed by all of
 * its own descendants before any sibling. Shared by computeNodePositions
 * (which also needs each node's depth to derive y from its direct parent)
 * and buildNodeTree (which renders this order as a flat, indented list).
 */
export function walkNodesDepthFirst(nodes: FlowNode[], childrenByParent: Map<NodeId, FlowNode[]>): NodeTraversalEntry[] {
  const order: NodeTraversalEntry[] = []
  const stack: NodeTraversalEntry[] = nodes.filter((node) => node.parentId === -1).map((node) => ({ node, depth: 0 }))

  while (stack.length > 0) {
    const entry = stack.pop()!
    order.push(entry)

    // Push in reverse so the leftmost child is popped (and thus visited) first.
    const children = childrenByParent.get(entry.node.id) ?? []
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push({ node: children[i], depth: entry.depth + 1 })
    }
  }

  return order
}

/**
 * Returns each node's CENTER so that a parent and child of
 * different rendered widths or heights (e.g. a connector under a full-width
 * node) still line up visually. Callers that need Vue Flow's top-left
 * `position` must subtract half of the node's own width/height via
 * `getNodeWidth`/`getNodeHeight`.
 */
export function computeNodePositions(nodes: FlowNode[]): Map<NodeId, FlowPosition> {
  const childrenByParent = groupChildrenByParent(nodes)
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const order = walkNodesDepthFirst(nodes, childrenByParent)

  const yById = new Map<NodeId, number>()
  const xSlotById = new Map<NodeId, number>()

  // Pass 1 (top-down): walk the tree parent-before-children. Each node's y
  // is its parent's y, plus the parent's height, plus a gap, plus its own
  // height — stacked directly under its parent. Each leaf (no children) also
  // gets the next horizontal slot, in increasing order (0, 1, 2, ...), left
  // to right. Parent nodes get no horizontal slot here — only nodes with 
  // no children do.
  let nextLeafSlot = 0
  for (const { node } of order) {
    const parent = node.parentId === -1 ? undefined : nodesById.get(node.parentId)
    const y = parent ? yById.get(parent.id)! + getNodeHeight(parent) / 2 + DEFAULT_VERTICAL_SPACING + getNodeHeight(node) / 2 : 0
    yById.set(node.id, y)

    const children = childrenByParent.get(node.id) ?? []
    if (children.length === 0) {
      xSlotById.set(node.id, nextLeafSlot++)
    }
  }

  // Pass 2 (bottom-up): set each parent's horizontal slot to the midpoint of
  // its leftmost and rightmost child's slot. This must run after pass 1,
  // since a parent needs its children's slots to already be set. `order`
  // lists each node before its descendants, so reading it backwards visits
  // a node's children before the node itself — no extra sorting needed to
  // get that ordering.
  for (let i = order.length - 1; i >= 0; i--) {
    const node = order[i].node
    if (xSlotById.has(node.id)) continue // leaf, already slotted in pass 1

    const children = childrenByParent.get(node.id)!
    const leftSlot = xSlotById.get(children[0].id)!
    const rightSlot = xSlotById.get(children[children.length - 1].id)!
    xSlotById.set(node.id, leftSlot + (rightSlot - leftSlot) / 2)
  }

  const positions = new Map<NodeId, FlowPosition>()
  for (const node of nodes) {
    positions.set(node.id, {
      x: xSlotById.get(node.id)! * HORIZONTAL_SPACING,
      y: yById.get(node.id)!,
    })
  }

  return positions
}
