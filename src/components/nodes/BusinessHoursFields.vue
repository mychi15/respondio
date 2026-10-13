<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { X } from '@lucide/vue'
import type { BusinessHoursNode, Weekday } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import { getBrowserTimezone } from '@/utils/helpers'
import { validateBusinessHours } from '@/utils/nodeFormValidation'
import { TIMEZONE_OPTIONS } from '@/data/timezoneOptions'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox, ComboboxAnchor, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxTrigger } from '@/components/ui/combobox'

const props = defineProps<{ node: BusinessHoursNode }>()

const flowStore = useFlowStore()

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

const times = reactive<BusinessHoursNode['data']['times']>([])
const timezone = ref('')

watch(
  () => props.node,
  (next) => {
    times.splice(0, times.length, ...next.data.times.map((row) => ({ ...row })))
    timezone.value = next.data.timezone || getBrowserTimezone()
  },
  { immediate: true },
)

const selectedTimezoneLabel = computed(
  () => TIMEZONE_OPTIONS.find((option) => option.zone === timezone.value)?.label ?? timezone.value,
)

function abbreviateDay(day: Weekday): string {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

const rowErrors = computed(() => validateBusinessHours(times))

// Exposed so the panel can hold Save while any row is invalid.
const isValid = computed(() => rowErrors.value.every((error) => error === undefined))

function save() {
  flowStore.updateBusinessHours(props.node.id, { times: times.map((row) => ({ ...row })), timezone: timezone.value })
}

// Starts on the first weekday without hours yet, so adding rows doesn't
// immediately create a duplicate of an existing one.
function addTimeRow() {
  const day = WEEKDAYS.find((candidate) => !times.some((row) => row.day === candidate)) ?? 'mon'
  times.push({ day, startTime: '09:00', endTime: '17:00' })
}

function removeTimeRow(index: number) {
  times.splice(index, 1)
}

defineExpose({ save, isValid })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <Label for="business-hours-timezone">Timezone</Label>
      <Combobox v-model="timezone">
        <ComboboxAnchor>
          <ComboboxInput
            id="business-hours-timezone"
            :display-value="() => selectedTimezoneLabel"
            placeholder="Search timezone"
          />
          <ComboboxTrigger />
        </ComboboxAnchor>
        <ComboboxContent>
          <ComboboxEmpty>No timezone found</ComboboxEmpty>
          <ComboboxItem v-for="option in TIMEZONE_OPTIONS" :key="option.zone" :value="option.zone" :text-value="option.label">
            {{ option.label }}
          </ComboboxItem>
        </ComboboxContent>
      </Combobox>
    </div>

    <div class="flex flex-col gap-1.5">
      <Label for="times">Business hours</Label>
      <div
        v-for="(row, index) in times"
        :key="index"
        class="flex flex-col gap-1.5 rounded-md border border-gray-200 p-2"
      >
        <div class="flex items-center gap-1.5">
          <Select v-model="row.day">
            <SelectTrigger size="sm" class="w-20 shrink-0">
              <SelectValue>{{ abbreviateDay(row.day) }}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="day in WEEKDAYS" :key="day" :value="day">
                {{ WEEKDAY_LABELS[day] }} ({{ abbreviateDay(day) }})
              </SelectItem>
            </SelectContent>
          </Select>

          <input
            v-model="row.startTime"
            type="time"
            aria-label="Start time"
            :aria-invalid="Boolean(rowErrors[index]) || undefined"
            :aria-describedby="rowErrors[index] ? `business-hours-error-${index}` : undefined"
            class="h-7 min-w-[5.5rem] flex-1 rounded-md border border-gray-300 px-1 text-xs"
          >
          <span class="shrink-0 text-xs text-gray-400">to</span>
          <input
            v-model="row.endTime"
            type="time"
            aria-label="End time"
            :aria-invalid="Boolean(rowErrors[index]) || undefined"
            :aria-describedby="rowErrors[index] ? `business-hours-error-${index}` : undefined"
            class="h-7 min-w-[5.5rem] flex-1 rounded-md border border-gray-300 px-1 text-xs"
          >
          <Button variant="ghost" size="icon-sm" class="shrink-0" @click="removeTimeRow(index)">
            <X />
            <span class="sr-only">Remove time</span>
          </Button>
        </div>
        <p v-if="rowErrors[index]" :id="`business-hours-error-${index}`" class="text-xs text-red-500">{{ rowErrors[index] }}</p>
      </div>
    </div>

    <Button variant="outline" size="sm" class="self-start" @click="addTimeRow">Add time</Button>
  </div>
</template>
