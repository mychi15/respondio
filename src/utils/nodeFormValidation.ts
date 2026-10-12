import type { CreatableNodeType, NodeId } from '@/types/flow'

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

export function validateCreateNodeForm(input: CreateNodeFormInput, requiresParent: boolean): CreateNodeFormErrors {
  const errors: CreateNodeFormErrors = {}

  if (input.type !== 'trigger' && !input.name.trim()) {
    errors.name = 'Title is required'
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
