<template>
  <aside v-if="settingsStore.general.logPanelVisible" ref="panelRef" class="log-panel" :style="dragStyle">
    <TechPanel title="操作日志">
      <template #extra>
        <span class="clear-btn" @click="logStore.clear">清空</span>
      </template>
      <div class="log-list">
        <div
          v-for="log in logStore.reversedLogs"
          :key="log.id"
          class="log-item"
          :class="log.status"
        >
          <div class="log-time">{{ log.time }}</div>
          <div class="log-action">
            <span class="log-source" :class="log.source">[{{ log.source === 'api' ? 'API' : '用户' }}]</span>
            {{ log.action }}
          </div>
          <div v-if="log.detail" class="log-detail">{{ log.detail }}</div>
        </div>
        <div v-if="logStore.logs.length === 0" class="log-empty">暂无操作日志</div>
      </div>
    </TechPanel>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLogStore } from '@/stores/logStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useDraggable } from '@/composables/useDraggable'
import TechPanel from '@/components/common/TechPanel.vue'

const logStore = useLogStore()
const settingsStore = useSettingsStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
</script>

<style scoped>
.log-panel {
  position: absolute;
  left: 16px;
  top: calc(var(--header-height) + 16px);
  width: var(--panel-width);
  max-height: calc(100% - var(--header-height) - var(--status-height) - 360px);
  z-index: 50;
}

.clear-btn {
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
}

.clear-btn:hover {
  color: var(--danger);
}

.log-list {
  max-height: calc(100vh - var(--header-height) - var(--status-height) - 120px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-item {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 2px solid var(--text-muted);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.log-item.success {
  border-left-color: var(--success);
}

.log-item.fail {
  border-left-color: var(--danger);
}

.log-time {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11px;
  margin-bottom: 4px;
}

.log-action {
  color: var(--text-primary);
}

.log-source {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  margin-right: 4px;
}

.log-source.user {
  color: var(--accent-cyan);
  background: rgba(0, 212, 255, 0.1);
}

.log-source.api {
  color: var(--warning);
  background: rgba(245, 158, 11, 0.1);
}

.log-detail {
  color: var(--text-secondary);
  margin-top: 4px;
  word-break: break-all;
}

.log-empty {
  color: var(--text-muted);
  text-align: center;
  padding: 20px 0;
  font-size: 13px;
}
</style>
