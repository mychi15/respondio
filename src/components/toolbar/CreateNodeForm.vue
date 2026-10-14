<script setup lang="ts">
import { reactive } from 'vue'
import type { CreatableNodeType, NodeId } from '@/types/flow'
import { FLOW_NODE_TYPE_LABELS, NODE_TYPE_EDGE_OPTIONS } from '@/types/flow'
import { NODE_ICON_MAP } from '@/components/icons'
import { isCreateNodeFormValid, TEXT_MAX_LENGTH, TITLE_MAX_LENGTH, validateCreateNodeForm } from '@/utils/nodeFormValidation'
import type { CreateNodeFormErrors, CreateNodeFormInput } from '@/utils/nodeFormValidation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import FieldMessage from '@/components/forms/FieldMessage.vue'
import NodeTreeSelect from './NodeTreeSelect.vue'

const props = defineProps<{ types: readonly CreatableNodeType[]; requiresParent: boolean }>()

const emit = defineEmits<{
  submit: [input: { name?: string; description?: string; type: CreatableNodeType; parentId: NodeId | null }]
}>()

const form = reactive<CreateNodeFormInput>({ name: '', description: '', type: '', parentId: null })
const errors = reactive<CreateNodeFormErrors>({})

// aria-invalid/aria-describedby for a field, so its error is announced with it.
function errorAttrs(field: keyof CreateNodeFormErrors) {
  return errors[field] ? { 'aria-invalid': true, 'aria-describedby': `create-node-${field}-error` } : {}
}

function handleSubmit() {
  const validationErrors = validateCreateNodeForm(form, props.requiresParent)
  Object.assign(errors, { name: undefined, description: undefined, type: undefined, parentId: undefined }, validationErrors)

  if (!isCreateNodeFormValid(validationErrors) || !form.type) return

  emit('submit', {
    name: form.type === 'trigger' ? undefined : form.name.trim(),
    description: form.type === 'trigger' ? undefined : form.description?.trim() || undefined,
    type: form.type,
    parentId: form.parentId,
  })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <div class="flex flex-col gap-1.5">
      <Label for="create-node-type">Type</Label>
      <Select v-model="form.type">
        <SelectTrigger id="create-node-type" class="w-full" v-bind="errorAttrs('type')">
          <SelectValue placeholder="Select a type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="type in props.types" :key="type" :value="type">
            <component :is="NODE_ICON_MAP[type]" class="size-3.5" :style="{ color: NODE_TYPE_EDGE_OPTIONS[type].color }" />
            {{ FLOW_NODE_TYPE_LABELS[type] }}
          </SelectItem>
        </SelectContent>
      </Select>
      <FieldMessage id="create-node-type-error" :error="errors.type" />
    </div>

    <template v-if="form.type !== 'trigger'">
      <div class="flex flex-col gap-1.5">
        <Label for="create-node-name">Title</Label>
        <Input id="create-node-name" v-model="form.name" placeholder="Node title" v-bind="errorAttrs('name')" />
        <FieldMessage id="create-node-name-error" :error="errors.name" :length="form.name.length" :max-length="TITLE_MAX_LENGTH" />
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="create-node-description">Description</Label>
        <Textarea id="create-node-description" v-model="form.description" placeholder="Optional description" v-bind="errorAttrs('description')" />
        <FieldMessage
          id="create-node-description-error"
          :error="errors.description"
          :length="form.description?.length ?? 0"
          :max-length="TEXT_MAX_LENGTH"
        />
      </div>

      <div v-if="props.requiresParent" class="flex flex-col gap-1.5">
        <!-- Labelled by both, so the button reads "Parent, <selected node>"
             rather than a <label for> replacing its name with just "Parent". -->
        <Label id="create-node-parent-label" as="span">Parent</Label>
        <NodeTreeSelect
          id="create-node-parent"
          v-model="form.parentId"
          aria-labelledby="create-node-parent-label create-node-parent"
          v-bind="errorAttrs('parentId')"
        />
        <FieldMessage id="create-node-parentId-error" :error="errors.parentId" />
      </div>
    </template>

    <Button type="submit" class="mt-2 self-end">Create</Button>
  </form>
</template>
