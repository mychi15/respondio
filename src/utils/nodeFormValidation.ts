import type { BusinessHoursNode, CreatableNodeType, NodeId } from '../types/flow.js'

export interface CreateNodeFormInput {
  name: string
  description?: string
  type: CreatableNodeType | ''
  parentId: NodeId | null
}

export interface CreateNodeFormErrors {
  name?: string
  description?: string
  type?: string
  parentId?: string
}

// Titles show on a single, truncated card line; free text (descriptions,
// messages, comments) is capped so one field can't bloat the saved flow.
export const TITLE_MAX_LENGTH = 100
export const TEXT_MAX_LENGTH = 1000

export function validateMaxLength(value: string, max: number, field: string): string | undefined {
  return value.length > max ? `${field} must be ${max} characters or fewer` : undefined
}

/** Shared by the create form and the details drawer, so both enforce the same rule. */
export function validateTitle(name: string): string | undefined {
  if (!name.trim()) return 'Title is required'
  return validateMaxLength(name, TITLE_MAX_LENGTH, 'Title')
}

export function validateDescription(description: string): string | undefined {
  return validateMaxLength(description, TEXT_MAX_LENGTH, 'Description')
}

export function validateCreateNodeForm(input: CreateNodeFormInput, requiresParent: boolean): CreateNodeFormErrors {
  const errors: CreateNodeFormErrors = {}

  if (input.type !== 'trigger') {
    const nameError = validateTitle(input.name)
    if (nameError) errors.name = nameError
    const descriptionError = validateDescription(input.description ?? '')
    if (descriptionError) errors.description = descriptionError
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

function isCompleteRange(row: BusinessHoursRow): boolean {
  return Boolean(row.startTime && row.endTime) && row.startTime < row.endTime
}

/**
 * One error message per row (undefined when the row is valid), in row order.
 * A row whose range overlaps an earlier, valid row on the same day is flagged;
 * the earlier row stays valid, so it's clear which row to change. Ranges are
 * half-open, so 09:00–12:00 and 12:00–17:00 can sit back to back. Times are
 * "HH:mm", so string comparison orders them correctly.
 */
export function validateBusinessHours(rows: readonly BusinessHoursRow[]): Array<string | undefined> {
  return rows.map((row, index) => {
    if (!row.startTime || !row.endTime) return 'Start and end time are required'
    if (row.startTime >= row.endTime) return 'Start time must be before end time'
    const overlaps = rows
      .slice(0, index)
      .some((other) => other.day === row.day && isCompleteRange(other) && row.startTime < other.endTime && other.startTime < row.endTime)
    if (overlaps) return 'Overlaps another time range on this day'
    return undefined
  })
}

// Attachment rules shared by the upload token endpoint (api/upload.ts), which
// enforces them, and the browser (SendMessageFields.vue), which checks them
// first so a bad file is rejected with a clear reason before any upload starts.

export const ALLOWED_ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf']

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

const ALLOWED_TYPE_NAMES = 'PNG, JPEG, GIF, WebP, SVG or PDF'

export const ATTACHMENT_RULES_HINT = `${ALLOWED_TYPE_NAMES}, up to ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB each.`

export function validateAttachment(file: { name: string; type: string; size: number }): string | undefined {
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) return `"${file.name}" isn't a supported file type. Use ${ALLOWED_TYPE_NAMES}.`
  if (file.size > MAX_ATTACHMENT_BYTES) return `"${file.name}" is larger than ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB.`
  return undefined
}
