import type { BusinessHoursNode, CreatableNodeType, NodeId } from '@/types/flow'

export interface CreateNodeFormInput {
  name: string
  description?: string
  type: CreatableNodeType | ''
  parentId: NodeId | null
}

export interface CreateNodeFormErrors {
  name?: string
  type?: string
  parentId?: string
}

/** Shared by the create form and the details drawer, so both enforce the same rule. */
export function validateTitle(name: string): string | undefined {
  return name.trim() ? undefined : 'Title is required'
}

export function validateCreateNodeForm(input: CreateNodeFormInput, requiresParent: boolean): CreateNodeFormErrors {
  const errors: CreateNodeFormErrors = {}

  if (input.type !== 'trigger') {
    const nameError = validateTitle(input.name)
    if (nameError) errors.name = nameError
  }

  if (!input.type) {
    errors.type = 'Type is required'
  }

  if (requiresParent && input.type !== 'trigger' && input.parentId === null) {
    errors.parentId = 'Parent node is required'
  }

  return errors
}

export function isCreateNodeFormValid(errors: CreateNodeFormErrors): boolean {
  return Object.keys(errors).length === 0
}

export type BusinessHoursRow = BusinessHoursNode['data']['times'][number]

/**
 * One error message per row (undefined when the row is valid), in row order.
 * A row repeating an earlier row's day with the same start or end time is
 * flagged as the duplicate; the first occurrence stays valid, so it's clear
 * which row to change.
 */
export function validateBusinessHours(rows: readonly BusinessHoursRow[]): Array<string | undefined> {
  return rows.map((row, index) => {
    if (!row.startTime || !row.endTime) return 'Start and end time are required'
    if (row.startTime >= row.endTime) return 'Start time must be before end time'
    const isDuplicate = rows
      .slice(0, index)
      .some((other) => other.day === row.day && (other.startTime === row.startTime || other.endTime === row.endTime))
    if (isDuplicate) return 'Another row on this day already starts or ends at this time'
    return undefined
  })
}
