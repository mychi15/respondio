import type { Edge, Node } from '@vue-flow/core'
import { getNodeEdgeColor, isAddableNodeType, NON_INTERACTIVE_NODE_TYPES } from '@/types/flow'
import type { FlowNode, FlowNodeType, NodeId } from '@/types/flow'
import { computeNodePositions, DEFAULT_VERTICAL_SPACING, getNodeHeight, getNodeWidth, groupChildrenByParent, walkNodesDepthFirst } from './flowLayout'
import type { FlowPosition } from './flowLayout'

export interface AddEdgeData {
  kind: 'insert' | 'add'
  sourceId: NodeId
  targetId?: NodeId
  parentId?: NodeId
  hoverColor: string
  addable: boolean
}

export function buildEdgesFromNodes(nodes: FlowNode[]): Edge<AddEdgeData>[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))

  return nodes
    .filter((node) => node.parentId !== -1)
    .map((node) => {
      const parent = nodesById.get(node.parentId)
      return {
        id: `e-${node.parentId}-${node.id}`,
        source: String(node.parentId),
        target: String(node.id),
        type: 'customEdge',
        data: {
          kind: 'insert',
          sourceId: node.parentId,
          targetId: node.id,
          hoverColor: parent ? getNodeEdgeColor(parent) : '#9ca3af',
          addable: parent ? isAddableNodeType(parent.type) : true,
        },
      }
    })
}

export function isInteractiveNodeType(type: FlowNodeType): boolean {
  return !NON_INTERACTIVE_NODE_TYPES.includes(type as (typeof NON_INTERACTIVE_NODE_TYPES)[number])
}

export function toVueFlowNodes(nodes: FlowNode[], positions?: Map<NodeId, FlowPosition>): Node<FlowNode>[] {
  const resolvedPositions = positions ?? computeNodePositions(nodes)

  return nodes.map((node) => {
    const interactive = isInteractiveNodeType(node.type)
    const center = resolvedPositions.get(node.id) ?? { x: 0, y: 0 }
    return {
      id: String(node.id),
      type: 'flowNode',
      position: { x: center.x - getNodeWidth(node) / 2, y: center.y - getNodeHeight(node) / 2 },
      data: node,
      draggable: true,
      selectable: interactive,
      focusable: interactive,
    }
  })
}

export interface NodeTreeItem {
  node: FlowNode
  depth: number
  selectable: boolean
}

/**
 * Flat, nested/indented list of every node (e.g. for a parent picker),
 * ordered by the same pre-order depth-first walk computeNodePositions uses.
 * `selectable` reuses isAddableNodeType so dateTime rows are shown (for
 * context, and because their connector children are still valid parents)
 * but rendered disabled.
 */
export function buildNodeTree(nodes: FlowNode[]): NodeTreeItem[] {
  const childrenByParent = groupChildrenByParent(nodes)
  return walkNodesDepthFirst(nodes, childrenByParent).map(({ node, depth }) => ({
    node,
    depth,
    selectable: isAddableNodeType(node.type),
  }))
}

export function buildAddNodePlaceholders(
  nodes: FlowNode[],
  positions: Map<NodeId, FlowPosition>,
): { nodes: Node[]; edges: Edge<AddEdgeData>[] } {
  const parentIds = new Set(nodes.map((node) => node.parentId))
  const leaves = nodes.filter((node) => !parentIds.has(node.id) && isAddableNodeType(node.type))

  const placeholderNodes: Node[] = []
  const placeholderEdges: Edge<AddEdgeData>[] = []

  for (const leaf of leaves) {
    const leafPosition = positions.get(leaf.id) ?? { x: 0, y: 0 }
    const placeholderId = `add-${leaf.id}`

    const leafBottomY = leafPosition.y + getNodeHeight(leaf) / 2

    placeholderNodes.push({
      id: placeholderId,
      type: 'addNodePlaceholder',
      position: { x: leafPosition.x, y: leafBottomY + DEFAULT_VERTICAL_SPACING / 2 },
      data: { parentId: leaf.id },
      draggable: false,
      selectable: false,
      focusable: false,
    })

    placeholderEdges.push({
      id: `add-edge-${leaf.id}`,
      source: String(leaf.id),
      target: placeholderId,
      type: 'customEdge',
      data: { kind: 'add', sourceId: leaf.id, parentId: leaf.id, hoverColor: getNodeEdgeColor(leaf), addable: true },
    })
  }

  return { nodes: placeholderNodes, edges: placeholderEdges }
}
