<template>
  <aside
    v-if="viewerStore.modelLoaded && viewerStore.showMeasurementPanel"
    ref="panelRef"
    class="measurement-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="测量工具">
      <template #extra>
        <span class="close-btn" @click="closePanel">✕</span>
      </template>
      <div class="panel-content">
        <div class="mode-actions">
          <TechButton
            :active="viewerStore.measurementType === 'distance'"
            @click="start('distance')"
          >📏 距离</TechButton>
          <TechButton
            :active="viewerStore.measurementType === 'angle'"
            @click="start('angle')"
          >📐 角度</TechButton>
          <TechButton
            :active="viewerStore.measurementType === 'area'"
            @click="start('area')"
          >⬡ 面积</TechButton>
        </div>

        <div v-if="viewerStore.measurementActive" class="hint">
          {{ hintText }}
        </div>

        <div v-if="viewerStore.measurementPoints.length > 0" class="points-list">
          <div
            v-for="(p, index) in viewerStore.measurementPoints"
            :key="index"
            class="point-row"
          >
            <span class="point-index">P{{ index + 1 }}</span>
            <span class="point-coord">{{ formatCoord(p) }}</span>
          </div>
        </div>

        <div v-if="viewerStore.measurementResult" class="result">
          {{ viewerStore.measurementResult }}
        </div>

        <TechButton v-if="viewerStore.measurementActive" danger @click="clear">
          清空重测
        </TechButton>
      </div>
    </TechPanel>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from '@/composables/useBIMViewer'
import { useDraggable } from '@/composables/useDraggable'
import { useResizable } from '@/composables/useResizable'
import TechPanel from '@/components/common/TechPanel.vue'
import TechButton from '@/components/common/TechButton.vue'
import type { MeasurementType, MeasurementPoint } from '@/types'

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 260, minHeight: 180 })

const hintText = computed(() => {
  const type = viewerStore.measurementType
  if (type === 'distance') return '在模型表面连续点击取点测量累计距离'
  if (type === 'angle') return '依次点击顶点、边上一点、另一边一点测量夹角'
  if (type === 'area') return '在模型表面按顺序点击至少 3 个点测量多边形面积'
  return ''
})

function start(type: MeasurementType) {
  viewer.value?.startMeasurement(type)
}

function clear() {
  viewer.value?.stopMeasurement()
  viewer.value?.startMeasurement(viewerStore.measurementType || 'distance')
}

function closePanel() {
  viewer.value?.stopMeasurement()
  viewerStore.setShowMeasurementPanel(false)
}

function formatCoord(p: MeasurementPoint): string {
  return `${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}`
}
</script>

<style scoped>
.measurement-panel {
  position: absolute;
  left: 16px;
  bottom: calc(var(--status-height) + 16px);
  width: var(--panel-width);
  height: 240px;
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
  overflow: auto;
  padding-right: 4px;
}

.panel-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.mode-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
}

.mode-actions .tech-button {
  padding: 5px 6px;
  font-size: 12px;
}

.hint {
  font-size: 11px;
  color: var(--accent-cyan);
  padding: 6px 8px;
  background: rgba(0, 212, 255, 0.08);
  border-radius: var(--radius-sm);
}

.points-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.point-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  font-size: 11px;
}

.point-index {
  color: var(--accent-cyan);
  font-weight: 600;
}

.point-coord {
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.result {
  padding: 8px 10px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: var(--radius-sm);
  color: var(--success);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}
</style>
