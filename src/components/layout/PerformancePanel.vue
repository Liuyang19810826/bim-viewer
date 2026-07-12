<template>
  <aside
    v-if="viewerStore.modelLoaded && viewerStore.showPerformancePanel"
    ref="panelRef"
    class="performance-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="性能统计">
      <template #extra>
        <span class="close-btn" @click="viewerStore.setShowPerformancePanel(false)">✕</span>
      </template>
      <div class="panel-content">
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">FPS</span>
            <span class="stat-value">{{ stats?.fps ?? 0 }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">帧时间</span>
            <span class="stat-value">{{ (stats?.frameTime ?? 0).toFixed(2) }} ms</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Draw Calls</span>
            <span class="stat-value">{{ stats?.drawCalls ?? 0 }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">三角面</span>
            <span class="stat-value">{{ formatNumber(stats?.triangles ?? 0) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">几何体</span>
            <span class="stat-value">{{ stats?.geometries ?? 0 }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">纹理</span>
            <span class="stat-value">{{ stats?.textures ?? 0 }}</span>
          </div>
        </div>
        <div class="chart-wrap">
          <div class="chart-label">FPS 曲线</div>
          <canvas ref="chartRef" width="280" height="60" />
        </div>
      </div>
    </TechPanel>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from '@/composables/useBIMViewer'
import { useDraggable } from '@/composables/useDraggable'
import { useResizable } from '@/composables/useResizable'
import TechPanel from '@/components/common/TechPanel.vue'

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const chartRef = ref<HTMLCanvasElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 280, minHeight: 200 })

const stats = computed(() => viewerStore.performanceStats)
let rafId = 0

function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}

function drawChart() {
  const canvas = chartRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const history = viewer.value?.getFpsHistory() || []
  const width = canvas.width
  const height = canvas.height
  ctx.clearRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()

  if (history.length < 2) return
  const max = Math.max(60, ...history)
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth = 2
  ctx.beginPath()
  history.forEach((fps, i) => {
    const x = (i / (history.length - 1)) * width
    const y = height - (fps / max) * height
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
}

function tick() {
  viewerStore.setPerformanceStats(viewer.value?.getPerformanceStats() || null)
  drawChart()
  rafId = requestAnimationFrame(tick)
}

onMounted(() => {
  tick()
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
})

watch(() => viewerStore.modelLoaded, (loaded) => {
  if (!loaded) viewerStore.setPerformanceStats(null)
})
</script>

<style scoped>
.performance-panel {
  position: absolute;
  right: 16px;
  top: calc(var(--header-height) + 520px);
  width: var(--panel-width);
  height: 260px;
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
  gap: 12px;
  height: calc(100% - 48px);
  overflow: hidden;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.chart-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chart-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.chart-wrap canvas {
  width: 100%;
  height: 60px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--radius-sm);
}
</style>
