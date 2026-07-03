import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { LOGS_STORAGE_KEY } from '@/utils/constants'
import { createLogEntry, trimLogs } from '@/utils/logger'
import type { LogEntry } from '@/types'

function loadLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as LogEntry[]
  } catch {
    // ignore
  }
  return []
}

export const useLogStore = defineStore('logs', () => {
  const logs = ref<LogEntry[]>(loadLogs())

  const reversedLogs = computed(() => [...logs.value].reverse())

  function add(action: string, status: LogEntry['status'] = 'success', source: LogEntry['source'] = 'user', detail?: string) {
    const entry = createLogEntry(action, status, source, detail)
    logs.value.push(entry)
    logs.value = trimLogs(logs.value)
    persist()
  }

  function clear() {
    logs.value = []
    persist()
  }

  function persist() {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs.value))
  }

  return {
    logs,
    reversedLogs,
    add,
    clear,
  }
})
