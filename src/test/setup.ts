import { vi } from 'vitest'
import mockFlowNodes from '../../api/_fixtures/mockFlow.json'

vi.mock('@/api/flowApi', () => ({
  API_BASE_URL: '',
  fetchFlow: vi.fn().mockResolvedValue(mockFlowNodes),
  saveFlow: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/api/uploadApi', () => ({
  uploadAttachment: vi.fn().mockResolvedValue('https://example.com/mock-attachment.png'),
}))
