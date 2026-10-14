import { describe, expect, it } from 'vitest'
import {
  isCreateNodeFormValid,
  TEXT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  validateBusinessHours,
  validateCreateNodeForm,
  validateDescription,
  validateMaxLength,
  validateTitle,
} from './nodeFormValidation'
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
  const OVERLAP = 'Overlaps another time range on this day'

  it('accepts distinct rows, including the same hours on different days', () => {
    expect(validateBusinessHours([row('mon', '09:00', '17:00'), row('tue', '09:00', '17:00')])).toEqual([undefined, undefined])
  })

  it('accepts two separate ranges on the same day', () => {
    expect(validateBusinessHours([row('mon', '09:00', '12:00'), row('mon', '13:00', '17:00')])).toEqual([undefined, undefined])
  })

  it('accepts back-to-back ranges where one ends as the next starts', () => {
    expect(validateBusinessHours([row('mon', '09:00', '12:00'), row('mon', '12:00', '17:00')])).toEqual([undefined, undefined])
  })

  it('flags a later range that partly overlaps an earlier one, leaving the first valid', () => {
    expect(validateBusinessHours([row('mon', '09:00', '12:00'), row('mon', '11:00', '14:00')])).toEqual([undefined, OVERLAP])
  })

  it('flags a range contained inside an earlier one', () => {
    expect(validateBusinessHours([row('mon', '09:00', '17:00'), row('mon', '10:00', '11:00')])).toEqual([undefined, OVERLAP])
  })

  it('does not flag overlap against an earlier row that is itself invalid', () => {
    expect(validateBusinessHours([row('mon', '17:00', '09:00'), row('mon', '10:00', '11:00')])).toEqual([
      'Start time must be before end time',
      undefined,
    ])
  })

  it('requires both times', () => {
    expect(validateBusinessHours([row('mon', '', '17:00')])).toEqual(['Start and end time are required'])
    expect(validateBusinessHours([row('mon', '09:00', '')])).toEqual(['Start and end time are required'])
  })

  it('requires the start time to be before the end time', () => {
    expect(validateBusinessHours([row('mon', '17:00', '09:00')])).toEqual(['Start time must be before end time'])
    expect(validateBusinessHours([row('mon', '09:00', '09:00')])).toEqual(['Start time must be before end time'])
  })

  it('flags a later row on the same day with the same start time', () => {
    expect(validateBusinessHours([row('mon', '09:00', '12:00'), row('mon', '09:00', '17:00')])).toEqual([undefined, OVERLAP])
  })

  it('flags a later row on the same day with the same end time', () => {
    expect(validateBusinessHours([row('mon', '09:00', '17:00'), row('mon', '13:00', '17:00')])).toEqual([undefined, OVERLAP])
  })

  it('flags an exact repeat', () => {
    expect(validateBusinessHours([row('fri', '09:00', '17:00'), row('fri', '09:00', '17:00')])).toEqual([undefined, OVERLAP])
  })
})

describe('length limits', () => {
  it('rejects a title over the limit', () => {
    expect(validateTitle('a'.repeat(TITLE_MAX_LENGTH))).toBeUndefined()
    expect(validateTitle('a'.repeat(TITLE_MAX_LENGTH + 1))).toBe(`Title must be ${TITLE_MAX_LENGTH} characters or fewer`)
  })

  it('rejects a description over the limit', () => {
    expect(validateDescription('a'.repeat(TEXT_MAX_LENGTH))).toBeUndefined()
    expect(validateDescription('a'.repeat(TEXT_MAX_LENGTH + 1))).toBe(`Description must be ${TEXT_MAX_LENGTH} characters or fewer`)
  })

  it('names the field in a generic max-length error', () => {
    expect(validateMaxLength('abcd', 3, 'Comment')).toBe('Comment must be 3 characters or fewer')
    expect(validateMaxLength('abc', 3, 'Comment')).toBeUndefined()
  })

  it('reports an over-long description from the create form, but not for a trigger', () => {
    const description = 'a'.repeat(TEXT_MAX_LENGTH + 1)
    expect(validateCreateNodeForm({ ...base, description }, false).description).toBe(`Description must be ${TEXT_MAX_LENGTH} characters or fewer`)
    expect(validateCreateNodeForm({ ...base, type: 'trigger', description }, false).description).toBeUndefined()
  })
})
