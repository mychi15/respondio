import { Clock, CirclePlus, MessageSquare, MessageSquareText, Zap } from '@lucide/vue'
import type { Component } from 'vue'
import type { FlowNodeType } from '@/types/flow'

export const NODE_ICON_MAP: Record<Exclude<FlowNodeType, 'dateTimeConnector'>, Component> = {
  trigger: Zap,
  sendMessage: MessageSquare,
  addComment: MessageSquareText,
  dateTime: Clock,
}

export const PlusCircleIcon: Component = CirclePlus
