import { describe, expect, it } from 'vitest'
import { isCreateNodeFormValid, validateBusinessHours, validateCreateNodeForm, validateTitle } from './nodeFormValidation'
import type { BusinessHoursRow, CreateNodeFormInput } from './nodeFormValidation'

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

describe('validateTitle', () => {
  it('rejects empty and whitespace-only titles', () => {
    expect(validateTitle('')).toBe('Title is required')
    expect(validateTitle('   ')).toBe('Title is required')
    expect(validateTitle('Welcome')).toBeUndefined()
  })
})

describe('validateBusinessHours', () => {
  const row = (day: BusinessHoursRow['day'], startTime: string, endTime: string): BusinessHoursRow => ({ day, startTime, endTime })
  const DUPLICATE = 'Another row on this day already starts or ends at this time'

  it('accepts distinct rows, including the same hours on different days', () => {
    expect(validateBusinessHours([row('mon', '09:00', '17:00'), row('tue', '09:00', '17:00')])).toEqual([undefined, undefined])
  })

  it('accepts two non-duplicate rows on the same day', () => {
    expect(validateBusinessHours([row('mon', '09:00', '12:00'), row('mon', '13:00', '17:00')])).toEqual([undefined, undefined])
  })

  it('requires both times', () => {
    expect(validateBusinessHours([row('mon', '', '17:00')])).toEqual(['Start and end time are required'])
    expect(validateBusinessHours([row('mon', '09:00', '')])).toEqual(['Start and end time are required'])
  })

  it('requires the start time to be before the end time', () => {
    expect(validateBusinessHours([row('mon', '17:00', '09:00')])).toEqual(['Start time must be before end time'])
    expect(validateBusinessHours([row('mon', '09:00', '09:00')])).toEqual(['Start time must be before end time'])
  })

  it('flags a later row on the same day with the same start time, leaving the first valid', () => {
    expect(validateBusinessHours([row('mon', '09:00', '12:00'), row('mon', '09:00', '17:00')])).toEqual([undefined, DUPLICATE])
  })

  it('flags a later row on the same day with the same end time', () => {
    expect(validateBusinessHours([row('mon', '09:00', '17:00'), row('mon', '13:00', '17:00')])).toEqual([undefined, DUPLICATE])
  })

  it('flags an exact repeat', () => {
    expect(validateBusinessHours([row('fri', '09:00', '17:00'), row('fri', '09:00', '17:00')])).toEqual([undefined, DUPLICATE])
  })
})
