import { describe, expect, it } from 'vitest'
import { isCreateNodeFormValid, validateCreateNodeForm } from './nodeFormValidation'
import type { CreateNodeFormInput } from './nodeFormValidation'

const base: CreateNodeFormInput = { name: 'Step', description: '', type: 'sendMessage', parentId: null }

describe('validateCreateNodeForm', () => {
  it('requires a non-empty, non-whitespace name for non-trigger types', () => {
    expect(validateCreateNodeForm({ ...base, name: '' }, false).name).toBe('Title is required')
    expect(validateCreateNodeForm({ ...base, name: '   ' }, false).name).toBe('Title is required')
    expect(validateCreateNodeForm({ ...base, name: 'Step' }, false).name).toBeUndefined()
  })

  it('does not require a name when type is trigger', () => {
    expect(validateCreateNodeForm({ ...base, type: 'trigger', name: '' }, false).name).toBeUndefined()
  })

  it('requires a type', () => {
    expect(validateCreateNodeForm({ ...base, type: '' }, false).type).toBe('Type is required')
  })

  it('requires a parentId only when requiresParent is true and type is not trigger', () => {
    expect(validateCreateNodeForm({ ...base, parentId: null }, true).parentId).toBe('Parent node is required')
    expect(validateCreateNodeForm({ ...base, parentId: '4' }, true).parentId).toBeUndefined()
    expect(validateCreateNodeForm({ ...base, parentId: null }, false).parentId).toBeUndefined()
    expect(validateCreateNodeForm({ ...base, type: 'trigger', parentId: null }, true).parentId).toBeUndefined()
  })

  it('returns no errors for a fully valid input, with or without a description', () => {
    expect(validateCreateNodeForm({ ...base, parentId: '4' }, true)).toEqual({})
    expect(validateCreateNodeForm({ ...base, description: 'Some text', parentId: '4' }, true)).toEqual({})
  })
})

describe('isCreateNodeFormValid', () => {
  it('is true when there are no error keys', () => {
    expect(isCreateNodeFormValid({})).toBe(true)
  })

  it('is false when any error key is present', () => {
    expect(isCreateNodeFormValid({ name: 'Title is required' })).toBe(false)
  })
})
