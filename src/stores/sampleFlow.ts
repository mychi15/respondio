import type { FlowNode } from '@/types/flow'

export const sampleFlowNodes: FlowNode[] = [
  {
    id: 1,
    parentId: -1,
    type: 'trigger',
    data: { type: 'conversationOpened', oncePerContact: true },
  },
  {
    id: 2,
    parentId: 4,
    type: 'sendMessage',
    name: 'Welcome message',
    // description:
    //   'Greets the contact and explains how to get help from the team during business hours.',
    data: {
      payload: [
        { type: 'text', text: 'Hi! Thanks for reaching out.' },
        { type: 'attachment', attachment: '/favicon.svg' },
      ],
    },
  },
  {
    id: 3,
    parentId: 1,
    type: 'dateTime',
    name: 'Business Hours',
    data: {
      times: [{ day: 'mon', startTime: '09:00', endTime: '18:00' }],
      connectors: [4, 5],
      timezone: 'UTC',
      action: 'businessHours',
    },
  },
  {
    id: 4,
    parentId: 3,
    type: 'dateTimeConnector',
    data: { connectorType: 'success' },
  },
  {
    id: 5,
    parentId: 3,
    type: 'dateTimeConnector',
    data: { connectorType: 'failure' },
  },
  {
    id: 6,
    parentId: 2,
    type: 'addComment',
    name: 'Note for agent',
    description:
      'Contact reached us within business hours; route to the sales queue for follow-up.',
    data: { comment: 'Within business hours — route to sales queue.' },
  },
]
