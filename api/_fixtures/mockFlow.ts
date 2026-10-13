import type { FlowNode } from '../../src/types/flow.js'

const mockFlow: FlowNode[] = [
  {
    id: 'a1b2c3',
    parentId: -1,
    type: 'trigger',
    data: { type: 'conversationOpened', oncePerContact: true },
  },
  {
    id: 'd4e5f6',
    parentId: 'a1b2c3',
    type: 'dateTime',
    name: 'Business Hours',
    data: {
      times: [
        { day: 'mon', startTime: '09:00', endTime: '18:00' },
        { day: 'tue', startTime: '09:00', endTime: '18:00' },
        { day: 'wed', startTime: '09:00', endTime: '18:00' },
        { day: 'thu', startTime: '09:00', endTime: '18:00' },
        { day: 'fri', startTime: '09:00', endTime: '17:00' },
      ],
      connectors: ['b7c8d9', 'e0f1a2'],
      timezone: 'UTC',
      action: 'businessHours',
    },
  },
  {
    id: 'b7c8d9',
    parentId: 'd4e5f6',
    type: 'dateTimeConnector',
    data: { connectorType: 'success' },
  },
  {
    id: 'e0f1a2',
    parentId: 'd4e5f6',
    type: 'dateTimeConnector',
    data: { connectorType: 'failure' },
  },
  {
    id: 'f3a4b5',
    parentId: 'b7c8d9',
    type: 'sendMessage',
    name: 'Welcome message',
    data: {
      payload: [
        { type: 'text', text: 'Hi! Thanks for reaching out during business hours.' },
        { type: 'attachment', attachment: '/favicon.svg' },
      ],
    },
  },
  {
    id: 'c6d7e8',
    parentId: 'e0f1a2',
    type: 'sendMessage',
    name: 'After-hours message',
    description: 'Sent when a contact messages outside business hours; sets expectations for a reply time.',
    data: {
      payload: [{ type: 'text', text: "We're currently offline. We'll get back to you during business hours." }],
    },
  },
  {
    id: 'a9b0c1',
    parentId: 'f3a4b5',
    type: 'addComment',
    name: 'Note for agent',
    description: 'Contact reached us within business hours; route to the sales queue for follow-up.',
    data: { comment: 'Within business hours — route to sales queue.' },
  },
]

export default mockFlow
