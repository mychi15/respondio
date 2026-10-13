<script setup lang="ts">
import { reactive } from 'vue'
import type { CreatableNodeType, NodeId } from '@/types/flow'
import { FLOW_NODE_TYPE_LABELS, NODE_TYPE_EDGE_OPTIONS } from '@/types/flow'
import { NODE_ICON_MAP } from '@/components/icons'
import { isCreateNodeFormValid, validateCreateNodeForm } from '@/utils/nodeFormValidation'
import type { CreateNodeFormInput } from '@/utils/nodeFormValidation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import NodeTreeSelect from './NodeTreeSelect.vue'

const props = defineProps<{ types: readonly CreatableNodeType[]; requiresParent: boolean }>()

const emit = defineEmits<{
  submit: [input: { name?: string; description?: string; type: CreatableNodeType; parentId: NodeId | null }]
}>()

const form = reactive<CreateNodeFormInput>({ name: '', description: '', type: '', parentId: null })
const errors = reactive<Record<string, string | undefined>>({})

function handleSubmit() {
  const validationErrors = validateCreateNodeForm(form, props.requiresParent)
  Object.assign(errors, { name: undefined, type: undefined, parentId: undefined }, validationErrors)

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
        <SelectTrigger id="create-node-type" class="w-full">
          <SelectValue placeholder="Select a type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="type in props.types" :key="type" :value="type">
            <component :is="NODE_ICON_MAP[type]" class="size-3.5" :style="{ color: NODE_TYPE_EDGE_OPTIONS[type].color }" />
            {{ FLOW_NODE_TYPE_LABELS[type] }}
          </SelectItem>
        </SelectContent>
      </Select>
      <p v-if="errors.type" class="text-xs text-red-500">{{ errors.type }}</p>
    </div>

    <template v-if="form.type !== 'trigger'">
      <div class="flex flex-col gap-1.5">
        <Label for="create-node-name">Title</Label>
        <Input id="create-node-name" v-model="form.name" placeholder="Node title" />
        <p v-if="errors.name" class="text-xs text-red-500">{{ errors.name }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="create-node-description">Description</Label>
        <Textarea id="create-node-description" v-model="form.description" placeholder="Optional description" />
      </div>

      <div v-if="props.requiresParent" class="flex flex-col gap-1.5">
        <Label>Parent</Label>
        <NodeTreeSelect v-model="form.parentId" />
        <p v-if="errors.parentId" class="text-xs text-red-500">{{ errors.parentId }}</p>
      </div>
    </template>

    <Button type="submit" class="mt-2 self-end">Create</Button>
  </form>
</template>
