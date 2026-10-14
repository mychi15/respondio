<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Loader2, Paperclip, X } from '@lucide/vue'
import type { SendMessageNode, SendMessagePayloadItem } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import { uploadAttachment } from '@/api/uploadApi'
import { useToast } from '@/composables/useToast'
import {
  ALLOWED_ATTACHMENT_TYPES,
  ATTACHMENT_RULES_HINT,
  TEXT_MAX_LENGTH,
  validateAttachment,
  validateMaxLength,
} from '@/utils/nodeFormValidation'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import FieldMessage from '@/components/forms/FieldMessage.vue'

const props = defineProps<{ node: SendMessageNode }>()

const flowStore = useFlowStore()
const toast = useToast()

interface AttachmentItem {
  id: string
  url: string
  uploading?: boolean
}

let nextAttachmentId = 0

const messageText = ref('')
const attachments = reactive<AttachmentItem[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

// Exposed so the panel can hold Save until every upload has a URL to store.
const isUploading = computed(() => attachments.some((attachment) => attachment.uploading))

const messageError = computed(() => validateMaxLength(messageText.value, TEXT_MAX_LENGTH, 'Message'))

// Exposed so the panel can hold Save while the message is too long.
const isValid = computed(() => !messageError.value)

const ACCEPT = ALLOWED_ATTACHMENT_TYPES.join(',')

watch(
  () => props.node,
  (next) => {
    messageText.value = next.data.payload.find((item) => item.type === 'text')?.text ?? ''
    attachments.splice(
      0,
      attachments.length,
      ...next.data.payload
        .filter((item) => item.type === 'attachment')
        .map((item) => ({ id: String(nextAttachmentId++), url: item.attachment })),
    )
  },
  { immediate: true },
)

const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|gif|webp|svg)$/i

function isImageAttachment(url: string): boolean {
  return IMAGE_EXTENSION_PATTERN.test(url)
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
    // `accept` only filters the picker (drag-drop and "All files" bypass it),
    // so the same rules the upload endpoint enforces are checked here first.
    const invalidReason = validateAttachment(file)
    if (invalidReason) {
      toast.show(invalidReason, 'error')
      continue
    }

    const id = String(nextAttachmentId++)
    attachments.push({ id, url: '', uploading: true })

    uploadAttachment(file)
      .then((url) => {
        const item = attachments.find((candidate) => candidate.id === id)
        if (item) {
          item.url = url
          item.uploading = false
        }
      })
      .catch(() => {
        attachments.splice(attachments.findIndex((candidate) => candidate.id === id), 1)
        toast.show(`Failed to upload "${file.name}". Please try again.`, 'error')
      })
  }

  input.value = ''
}

function save() {
  const payload: SendMessagePayloadItem[] = []
  const trimmedText = messageText.value.trim()
  if (trimmedText) payload.push({ type: 'text', text: trimmedText })
  for (const attachment of attachments) {
    if (!attachment.uploading) payload.push({ type: 'attachment', attachment: attachment.url })
  }

  flowStore.updateSendMessagePayload(props.node.id, payload)
}

defineExpose({ save, isUploading, isValid })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <Label for="send-message-text">Message</Label>
      <Textarea
        id="send-message-text"
        v-model="messageText"
        placeholder="Optional message text"
        :aria-invalid="Boolean(messageError) || undefined"
        :aria-describedby="messageError ? 'send-message-text-error' : undefined"
      />
      <FieldMessage id="send-message-text-error" :error="messageError" :length="messageText.length" :max-length="TEXT_MAX_LENGTH" />
    </div>

    <div class="flex flex-col gap-1.5">
      <Label>Attachments</Label>
      <div class="flex flex-wrap gap-1.5">
        <div
          v-for="(attachment, index) in attachments"
          :key="attachment.id"
          class="relative size-20 shrink-0 overflow-hidden rounded-md border border-gray-200"
        >
          <div v-if="attachment.uploading" class="flex size-full flex-col items-center justify-center gap-1 bg-gray-50 text-gray-400">
            <Loader2 class="size-5 animate-spin" />
            <span class="text-[10px]">Uploading…</span>
          </div>
          <img
            v-else-if="isImageAttachment(attachment.url)"
            :src="attachment.url"
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

      <Button variant="outline" size="sm" class="self-start" aria-describedby="send-message-attachment-hint" @click="openFilePicker">
        Add attachment
      </Button>
      <p id="send-message-attachment-hint" class="text-xs text-gray-500">{{ ATTACHMENT_RULES_HINT }}</p>
      <input ref="fileInput" type="file" class="hidden" multiple :accept="ACCEPT" @change="handleFileChange">
    </div>
  </div>
</template>
