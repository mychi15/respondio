import { camelCaseToWords } from '@/utils/helpers'

export type NodeId = string | number

export interface BaseNode<TType extends string, TData> {
  id: NodeId
  parentId: NodeId
  name?: string
  description?: string
  type: TType
  data: TData
}

export type TriggerNode = BaseNode<
  'trigger',
  { type: 'conversationOpened'; oncePerContact: boolean }
>

export type SendMessagePayloadItem =
  | { type: 'text'; text: string }
  | { type: 'attachment'; attachment: string }

export type SendMessageNode = BaseNode<'sendMessage', { payload: SendMessagePayloadItem[] }>

export type AddCommentNode = BaseNode<'addComment', { comment: string }>

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type BusinessHoursNode = BaseNode<
  'dateTime',
  {
    times: Array<{ day: Weekday; startTime: string; endTime: string }>
    connectors: NodeId[]
    timezone: string
    action: 'businessHours'
  }
>

export type ConnectorNode = BaseNode<'dateTimeConnector', { connectorType: 'success' | 'failure' }>

export type FlowNode =
  | TriggerNode
  | SendMessageNode
  | AddCommentNode
  | BusinessHoursNode
  | ConnectorNode

export type FlowNodeType = FlowNode['type']

export const NON_INTERACTIVE_NODE_TYPES = ['trigger', 'dateTimeConnector'] as const satisfies readonly FlowNodeType[]

export const FLOW_NODE_TYPE_LABELS: Record<FlowNodeType, string> = {
  trigger: 'Trigger',
  sendMessage: 'Send Message',
  addComment: 'Add Comment',
  dateTime: 'Business Hours',
  dateTimeConnector: 'Connector',
}

export interface NodeEdgeOptions {
  addable: boolean
  color: string
}

export const NODE_TYPE_EDGE_OPTIONS: Record<FlowNodeType, NodeEdgeOptions> = {
  trigger: { addable: true, color: '#64748b' },
  sendMessage: { addable: true, color: '#3b82f6' },
  addComment: { addable: true, color: '#a855f7' },
  dateTime: { addable: false, color: '#f59e0b' },
  dateTimeConnector: { addable: true, color: '#22c55e' },
}

export function getNodeEdgeColor(node: FlowNode): string {
  if (node.type === 'dateTimeConnector') {
    return node.data.connectorType === 'failure' ? '#ef4444' : NODE_TYPE_EDGE_OPTIONS.dateTimeConnector.color
  }

  return NODE_TYPE_EDGE_OPTIONS[node.type].color
}

export function isAddableNodeType(type: FlowNodeType): boolean {
  return NODE_TYPE_EDGE_OPTIONS[type].addable
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

/**
 * The single source of truth for whether (and what) description text a node
 * renders. Shared between FlowNodeRenderer (what to display) and the layout
 * math (how much vertical space to reserve), so the two never drift apart.
 */
export function getNodeDescription(node: FlowNode): string | undefined {
  if (node.description) {
    return node.description
  }

  if (node.type === 'dateTime') {
    return `Business Hours - ${node.data.timezone}`
  }

  if (node.type === 'trigger') {
    return camelCaseToWords(node.data.type)
  }

  if (node.type === 'sendMessage' && node.data.payload?.length) {
    return `Message:\n${node.data.payload
      .map((p) => (p.type === 'text' ? p.text : ''))
      .join(' ')}`
  }

  return undefined
}
