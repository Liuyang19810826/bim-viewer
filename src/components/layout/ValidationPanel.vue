<template>
  <aside
    v-if="viewerStore.modelLoaded && viewerStore.showValidationPanel"
    ref="panelRef"
    class="validation-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="glTF 校验">
      <template #extra>
        <span class="close-btn" @click="viewerStore.setShowValidationPanel(false)">✕</span>
      </template>
      <div class="panel-content">
        <div v-if="report" class="report-summary" :class="report.valid ? 'valid' : 'invalid'">
          {{ report.summary }}
        </div>
        <div v-else class="empty-tip">暂无校验报告</div>

        <div v-if="report" class="report-sections">
          <div class="section" :class="{ collapsed: !showErrors }">
            <div class="section-header" @click="showErrors = !showErrors">
              <span class="section-arrow">{{ showErrors ? '▼' : '▶' }}</span>
              <span class="section-title">错误 ({{ report.errors.length }})</span>
            </div>
            <div v-show="showErrors" class="section-body">
              <div v-for="(msg, index) in report.errors" :key="'e' + index" class="msg error">
                <span class="msg-path">{{ msg.path || '—' }}</span>
                <span class="msg-text">{{ msg.message }}</span>
              </div>
            </div>
          </div>

          <div class="section" :class="{ collapsed: !showWarnings }">
            <div class="section-header" @click="showWarnings = !showWarnings">
              <span class="section-arrow">{{ showWarnings ? '▼' : '▶' }}</span>
              <span class="section-title">警告 ({{ report.warnings.length }})</span>
            </div>
            <div v-show="showWarnings" class="section-body">
              <div v-for="(msg, index) in report.warnings" :key="'w' + index" class="msg warning">
                <span class="msg-path">{{ msg.path || '—' }}</span>
                <span class="msg-text">{{ msg.message }}</span>
              </div>
            </div>
          </div>

          <div class="section" :class="{ collapsed: !showInfos }">
            <div class="section-header" @click="showInfos = !showInfos">
              <span class="section-arrow">{{ showInfos ? '▼' : '▶' }}</span>
              <span class="section-title">提示 ({{ report.infos.length }})</span>
            </div>
            <div v-show="showInfos" class="section-body">
              <div v-for="(msg, index) in report.infos" :key="'i' + index" class="msg info">
                <span class="msg-path">{{ msg.path || '—' }}</span>
                <span class="msg-text">{{ msg.message }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TechPanel>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { useDraggable } from '@/composables/useDraggable'
import { useResizable } from '@/composables/useResizable'
import TechPanel from '@/components/common/TechPanel.vue'

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 280, minHeight: 200 })

const report = computed(() => viewerStore.gltfValidation)
const showErrors = ref(true)
const showWarnings = ref(true)
const showInfos = ref(false)
</script>

<style scoped>
.validation-panel {
  position: absolute;
  right: 16px;
  top: calc(var(--header-height) + 620px);
  width: var(--panel-width);
  height: 280px;
  max-height: calc(100vh - var(--header-height) - var(--status-height) - 32px);
  overflow: hidden;
  z-index: 52;
}

.close-btn {
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--danger);
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: calc(100% - 48px);
  overflow: hidden;
}

.report-summary {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.report-summary.valid {
  color: var(--success);
  background: rgba(16, 185, 129, 0.1);
}

.report-summary.invalid {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}

.empty-tip {
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  padding: 24px 0;
}

.report-sections {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.report-sections::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.report-sections::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

.report-sections::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.report-sections::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  cursor: pointer;
  user-select: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-header:hover {
  background: rgba(0, 212, 255, 0.08);
}

.section-arrow {
  font-size: 10px;
  color: var(--text-muted);
}

.section-body {
  padding: 0 10px 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.msg {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
}

.msg.error {
  background: rgba(239, 68, 68, 0.1);
  border-left: 2px solid var(--danger);
}

.msg.warning {
  background: rgba(245, 158, 11, 0.1);
  border-left: 2px solid var(--warning, #f59e0b);
}

.msg.info {
  background: rgba(6, 182, 212, 0.1);
  border-left: 2px solid var(--accent-cyan);
}

.msg-path {
  color: var(--text-muted);
  font-family: 'Courier New', monospace;
}

.msg-text {
  color: var(--text-primary);
}
</style>
