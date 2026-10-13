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

const messageText = ref('')
const attachments = reactive<string[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.node,
  (next) => {
    messageText.value = next.data.payload.find((item) => item.type === 'text')?.text ?? ''
    attachments.splice(
      0,
      attachments.length,
      ...next.data.payload.filter((item) => item.type === 'attachment').map((item) => item.attachment),
    )
  },
  { immediate: true },
)

const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|gif|webp|svg)$/i

function isImageAttachment(attachment: string): boolean {
  return attachment.startsWith('data:image/') || IMAGE_EXTENSION_PATTERN.test(attachment)
}

function removeAttachment(index: number) {
  attachments.splice(index, 1)
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
        attachments.push(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  input.value = ''
}

function save() {
  const payload: SendMessagePayloadItem[] = []
  const trimmedText = messageText.value.trim()
  if (trimmedText) payload.push({ type: 'text', text: trimmedText })
  for (const attachment of attachments) payload.push({ type: 'attachment', attachment })

  flowStore.updateSendMessagePayload(props.node.id, payload)
}

defineExpose({ save })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <Label for="send-message-text">Message</Label>
      <Textarea id="send-message-text" v-model="messageText" placeholder="Optional message text" />
    </div>

    <div class="flex flex-col gap-1.5">
      <Label>Attachments</Label>
      <div class="flex flex-wrap gap-1.5">
        <div
          v-for="(attachment, index) in attachments"
          :key="index"
          class="relative size-20 shrink-0 overflow-hidden rounded-md border border-gray-200"
        >
          <img
            v-if="isImageAttachment(attachment)"
            :src="attachment"
            alt="Attachment preview"
            class="size-full object-cover"
          >
          <div v-else class="flex size-full flex-col items-center justify-center gap-1 bg-gray-50 text-gray-400">
            <Paperclip class="size-5" />
            <span class="text-[10px]">File</span>
          </div>

          <Button
            variant="ghost"
            size="icon-xs"
            class="absolute right-0.5 top-0.5 bg-white/80 hover:bg-white"
            @click="removeAttachment(index)"
          >
            <X />
            <span class="sr-only">Remove attachment</span>
          </Button>
        </div>
      </div>

      <Button variant="outline" size="sm" class="self-start" @click="openFilePicker">Add attachment</Button>
      <input ref="fileInput" type="file" class="hidden" multiple @change="handleFileChange">
    </div>
  </div>
</template>
