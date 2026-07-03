import type { LogEntry } from '@/types'
import { MAX_LOG_ENTRIES } from './constants'

export function createLogEntry(
  action: string,
  status: LogEntry['status'] = 'success',
  source: LogEntry['source'] = 'user',
  detail?: string
): LogEntry {
  const now = new Date()
  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    time: now.toLocaleString('zh-CN'),
    action,
    status,
    source,
    detail,
  }
}

export function trimLogs(logs: LogEntry[]): LogEntry[] {
  if (logs.length <= MAX_LOG_ENTRIES) return logs
  return logs.slice(logs.length - MAX_LOG_ENTRIES)
}
