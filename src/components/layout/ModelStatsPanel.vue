<template>
  <aside
    v-if="viewerStore.modelLoaded && viewerStore.showModelStatsPanel"
    ref="panelRef"
    class="model-stats-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="模型统计">
      <template #extra>
        <span class="close-btn" @click="viewerStore.setShowModelStatsPanel(false)">✕</span>
      </template>
      <div class="stats-list">
        <div class="stat-row">
          <span class="stat-label">文件体积</span>
          <span class="stat-value">{{ formatSize(stats?.fileSize || 0) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">节点总数</span>
          <span class="stat-value">{{ formatNumber(stats?.nodeCount || 0) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Mesh 数量</span>
          <span class="stat-value">{{ formatNumber(stats?.meshCount || 0) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">顶点数</span>
          <span class="stat-value">{{ formatNumber(stats?.vertexCount || 0) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">三角面数</span>
          <span class="stat-value">{{ formatNumber(stats?.triangleCount || 0) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">材质数</span>
          <span class="stat-value">{{ formatNumber(stats?.materialCount || 0) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">纹理数</span>
          <span class="stat-value">{{ formatNumber(stats?.textureCount || 0) }}</span>
        </div>
      </div>
      <div v-if="nodeStats.vertexCount > 0" class="node-stats">
        <div class="node-stats-title">选中节点几何统计</div>
        <div class="stat-row">
          <span class="stat-label">顶点数</span>
          <span class="stat-value">{{ formatNumber(nodeStats.vertexCount) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">三角面数</span>
          <span class="stat-value">{{ formatNumber(nodeStats.triangleCount) }}</span>
        </div>
      </div>
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

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 240, minHeight: 180 })

const stats = computed(() => viewerStore.modelStats || viewer.value?.getModelStats())

const nodeStats = ref({ vertexCount: 0, triangleCount: 0 })

watch(
  () => viewerStore.selectedNodeUuid,
  (uuid) => {
    if (!uuid) {
      nodeStats.value = { vertexCount: 0, triangleCount: 0 }
      return
    }
    nodeStats.value = viewer.value?.getNodeGeometryStats(uuid) || { vertexCount: 0, triangleCount: 0 }
  },
  { immediate: true }
)

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString('zh-CN') : '0'
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}
</script>

<style scoped>
.model-stats-panel {
  position: absolute;
  right: 16px;
  top: calc(var(--header-height) + 16px);
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

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.stat-label {
  color: var(--text-secondary);
}

.stat-value {
  color: var(--text-primary);
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.node-stats {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--bg-panel-border);
}

.node-stats-title {
  font-size: 12px;
  color: var(--accent-cyan);
  margin-bottom: 8px;
}
</style>
