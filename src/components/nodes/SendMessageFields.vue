<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Paperclip, X } from '@lucide/vue'
import type { SendMessageNode, SendMessagePayloadItem } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps<{ node: SendMessageNode }>()

const flowStore = useFlowStore()

const payload = reactive<SendMessagePayloadItem[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.node,
  (next) => {
    payload.splice(0, payload.length, ...next.data.payload.map((item) => ({ ...item })))
  },
  { immediate: true },
)

function isImageAttachment(attachment: string): boolean {
  return attachment.startsWith('data:image/')
}

function addTextItem() {
  payload.push({ type: 'text', text: '' })
}

function removeItem(index: number) {
  payload.splice(index, 1)
}

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return

  for (const file of Array.from(files)) {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        payload.push({ type: 'attachment', attachment: reader.result })
      }
    }
    reader.readAsDataURL(file)
  }

  input.value = ''
}

function save() {
  flowStore.updateSendMessagePayload(
    props.node.id,
    payload.map((item) => ({ ...item })),
  )
}

defineExpose({ save })
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <Label>Message</Label>

    <div v-for="(item, index) in payload" :key="index" class="flex items-start gap-1.5">
      <Textarea
        v-if="item.type === 'text'"
        v-model="item.text"
        placeholder="Message text"
        class="flex-1"
      />
      <div v-else class="relative size-20 shrink-0 overflow-hidden rounded-md border border-gray-200">
        <img
          v-if="isImageAttachment(item.attachment)"
          :src="item.attachment"
          alt="Attachment preview"
          class="size-full object-cover"
        >
        <div v-else class="flex size-full flex-col items-center justify-center gap-1 bg-gray-50 text-gray-400">
          <Paperclip class="size-5" />
          <span class="text-[10px]">File</span>
        </div>
      </div>

      <Button variant="ghost" size="icon-sm" class="shrink-0" @click="removeItem(index)">
        <X />
        <span class="sr-only">Remove</span>
      </Button>
    </div>

    <div class="flex gap-1.5">
      <Button variant="outline" size="sm" class="self-start" @click="addTextItem">Add text</Button>
      <Button variant="outline" size="sm" class="self-start" @click="openFilePicker">Add attachment</Button>
      <input ref="fileInput" type="file" class="hidden" multiple @change="handleFileChange">
    </div>
  </div>
</template>
