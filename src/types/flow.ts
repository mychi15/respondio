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

export const CREATABLE_NODE_TYPES = ['sendMessage', 'addComment', 'dateTime'] as const satisfies readonly FlowNodeType[]

export const TOOLBAR_CREATABLE_NODE_TYPES = ['trigger', ...CREATABLE_NODE_TYPES] as const satisfies readonly FlowNodeType[]

export type CreatableNodeType = (typeof TOOLBAR_CREATABLE_NODE_TYPES)[number]

export interface NodeEdgeOptions {
  addable: boolean
  color: string
  hoverColor: string
}

export const NODE_TYPE_EDGE_OPTIONS: Record<FlowNodeType, NodeEdgeOptions> = {
  trigger: { addable: true, color: '#64748b', hoverColor: '#94a3b8' },
  sendMessage: { addable: true, color: '#3b82f6', hoverColor: '#60a5fa' },
  addComment: { addable: true, color: '#a855f7', hoverColor: '#c084fc' },
  dateTime: { addable: false, color: '#f59e0b', hoverColor: '#fbbf24' },
  dateTimeConnector: { addable: true, color: '#22c55e', hoverColor: '#4ade80' },
}

