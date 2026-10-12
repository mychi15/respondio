import type { Component } from 'vue'
import type { FlowNodeType } from '@/types/flow'
import AddCommentIcon from './components/AddCommentIcon.vue'
import DateTimeIcon from './components/DateTimeIcon.vue'
import SendMessageIcon from './components/SendMessageIcon.vue'
import TriggerIcon from './components/TriggerIcon.vue'

export const NODE_ICON_MAP: Record<Exclude<FlowNodeType, 'dateTimeConnector'>, Component> = {
  trigger: TriggerIcon,
  sendMessage: SendMessageIcon,
  addComment: AddCommentIcon,
  dateTime: DateTimeIcon,
}
