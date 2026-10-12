import { describe, expect, it } from 'vitest'
import { camelCaseToWords, generateNodeId } from './helpers'

describe('camelCaseToWords', () => {
  it('splits camelCase into space-separated title case words', () => {
    expect(camelCaseToWords('conversationOpened')).toBe('Conversation Opened')
    expect(camelCaseToWords('sendMessage')).toBe('Send Message')
  })

  it('capitalizes a single lowercase word with no internal casing', () => {
    expect(camelCaseToWords('trigger')).toBe('Trigger')
  })
})

describe('generateNodeId', () => {
  it('generates a 6-character hex id', () => {
    expect(generateNodeId()).toMatch(/^[0-9a-f]{6}$/)
  })

  it('avoids collisions with the given existing ids', () => {
    const existingIds = ['000000', '000001']
    const id = generateNodeId(existingIds)
    expect(existingIds).not.toContain(id)
  })
})
