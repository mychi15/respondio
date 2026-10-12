import { hasVariableLengthDescription } from '@/types/flow'
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

export function getNodeHeight(node: FlowNode): number {
  if (node.type === 'dateTimeConnector') return CONNECTOR_HEIGHT
  return hasVariableLengthDescription(node) ? NODE_WITH_DESCRIPTION_HEIGHT : NODE_HEIGHT
}

/**
 * Returns each node's CENTER (not top-left) so that a parent and child of
 * different rendered widths or heights (e.g. a connector under a full-width
 * node) still line up visually. Callers that need Vue Flow's top-left
 * `position` must subtract half of the node's own width/height via
 * `getNodeWidth`/`getNodeHeight`.
 */
export function computeNodePositions(nodes: FlowNode[]): Map<NodeId, FlowPosition> {
  const childrenByParent = new Map<NodeId, FlowNode[]>()
  for (const node of nodes) {
    const siblings = childrenByParent.get(node.parentId) ?? []
    siblings.push(node)
    childrenByParent.set(node.parentId, siblings)
  }

  const depthById = new Map<NodeId, number>()
  const yById = new Map<NodeId, number>()
  const xSlotById = new Map<NodeId, number>()

  // Pass 1: walk the tree depth-first with an explicit stack (so there's only
  // ever one traversal in flight, not a recursive call per level). Each
  // child's y is derived directly from its own parent's BOTTOM edge
  // (parent.y + parent height / 2) plus DEFAULT_VERTICAL_SPACING, then offset
  // by half the child's own height to land on the child's center — not from
  // depth * spacing, so a node is always positioned relative to its direct
  // parent's actual rendered edge. Also hands every leaf the next free
  // horizontal slot, in left-to-right order.
  let nextLeafSlot = 0
  const stack: Array<{ node: FlowNode; depth: number; y: number }> = nodes
    .filter((node) => node.parentId === -1)
    .map((node) => ({ node, depth: 0, y: 0 }))

  while (stack.length > 0) {
    const { node, depth, y } = stack.pop()!
    depthById.set(node.id, depth)
    yById.set(node.id, y)

    const children = childrenByParent.get(node.id) ?? []
    if (children.length === 0) {
      xSlotById.set(node.id, nextLeafSlot++)
      continue
    }

    // Push in reverse so the leftmost child is popped (and thus slotted) first.
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i]
      const childY = y + getNodeHeight(node) / 2 + DEFAULT_VERTICAL_SPACING + getNodeHeight(child) / 2
      stack.push({ node: child, depth: depth + 1, y: childY })
    }
  }

  // Pass 2: now that every leaf has a slot, fill in each parent's slot as the
  // midpoint between its leftmost and rightmost child. Visiting nodes deepest
  // first guarantees a node's children are already resolved when it's its turn.
  const byDepthDescending = [...nodes].sort((a, b) => depthById.get(b.id)! - depthById.get(a.id)!)

  for (const node of byDepthDescending) {
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
