<template>
  <aside
    v-if="viewerStore.showNodePropertiesPanel"
    ref="panelRef"
    class="node-properties-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="节点属性">
      <template #extra>
        <span class="close-btn" @click="viewerStore.setShowNodePropertiesPanel(false)">✕</span>
      </template>
      <div v-if="nodeProps" class="props-content">
        <div class="prop-section">
          <div class="prop-row">
            <span class="prop-label">名称</span>
            <span class="prop-value" :title="nodeProps.name">{{ nodeProps.name }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">类型</span>
            <span class="prop-value">{{ nodeProps.type }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">UUID</span>
            <span class="prop-value uuid" :title="nodeProps.uuid">{{ nodeProps.uuid }}</span>
          </div>
        </div>

        <div class="prop-section">
          <div class="section-title">Transform</div>
          <div class="prop-row">
            <span class="prop-label">Position</span>
            <span class="prop-value vector">{{ formatVector(nodeProps.position) }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Rotation</span>
            <span class="prop-value vector">{{ formatVector(nodeProps.rotation) }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Quaternion</span>
            <span class="prop-value vector">{{ formatQuaternion(nodeProps.quaternion) }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Scale</span>
            <span class="prop-value vector">{{ formatVector(nodeProps.scale) }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">World Pos</span>
            <span class="prop-value vector">{{ formatVector(nodeProps.worldPosition) }}</span>
          </div>
        </div>

        <div v-if="nodeProps.materialNames && nodeProps.materialNames.length > 0" class="prop-section">
          <div class="section-title">材质 ({{ nodeProps.materialNames.length }})</div>
          <div
            v-for="(name, index) in nodeProps.materialNames"
            :key="index"
            class="material-name"
          >{{ name }}</div>
        </div>

        <div class="prop-section">
          <div class="section-title user-data-title" @click="showUserData = !showUserData">
            <span>UserData / Extras</span>
            <span class="toggle-icon">{{ showUserData ? '▼' : '▶' }}</span>
          </div>
          <pre v-show="showUserData" class="json-block">{{ formattedUserData }}</pre>
        </div>
      </div>
      <div v-else class="empty-tip">未选中节点</div>
    </TechPanel>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from '@/composables/useBIMViewer'
import { useDraggable } from '@/composables/useDraggable'
import { useResizable } from '@/composables/useResizable'
import TechPanel from '@/components/common/TechPanel.vue'
import type { NodeProperties } from '@/types'

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 280, minHeight: 200 })

const showUserData = ref(true)

const nodeProps = computed<NodeProperties | null>(() => {
  const uuid = viewerStore.selectedNodeUuid
  if (!uuid) return null
  return viewer.value?.getNodeProperties(uuid) || null
})

const formattedUserData = computed(() => {
  if (!nodeProps.value) return ''
  try {
    return JSON.stringify(nodeProps.value.userData, null, 2)
  } catch {
    return String(nodeProps.value.userData)
  }
})

watch(() => viewerStore.selectedNodeUuid, () => {
  showUserData.value = true
})

function formatNumber(n: number): string {
  return Number.isFinite(n) ? n.toFixed(4) : String(n)
}

function formatVector(v: { x: number; y: number; z: number }): string {
  return `${formatNumber(v.x)}, ${formatNumber(v.y)}, ${formatNumber(v.z)}`
}

function formatQuaternion(q: { x: number; y: number; z: number; w: number }): string {
  return `${formatNumber(q.x)}, ${formatNumber(q.y)}, ${formatNumber(q.z)}, ${formatNumber(q.w)}`
}
</script>

<style scoped>
.node-properties-panel {
  position: absolute;
  right: 16px;
  top: calc(var(--header-height) + 420px);
  width: var(--panel-width);
  max-height: calc(100% - 32px);
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

.props-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - var(--header-height) - var(--status-height) - 240px);
  overflow: auto;
  padding-right: 4px;
}

.props-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.props-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

.props-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.props-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.prop-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  font-size: 12px;
  color: var(--accent-cyan);
  font-weight: 600;
  margin-bottom: 2px;
}

.user-data-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.toggle-icon {
  font-size: 10px;
  color: var(--text-muted);
}

.prop-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.prop-label {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.prop-value {
  color: var(--text-primary);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prop-value.uuid {
  font-family: 'Courier New', monospace;
  font-size: 10px;
}

.prop-value.vector {
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.material-name {
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--text-primary);
}

.json-block {
  margin: 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
  overflow: auto;
}

.empty-tip {
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  padding: 24px 0;
}
</style>
