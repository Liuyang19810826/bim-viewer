<template>
  <aside
    v-if="viewerStore.modelLoaded && viewerStore.showRegionZoomPanel"
    ref="panelRef"
    class="region-zoom-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="近景查看">
      <template #extra>
        <span class="close-btn" @click="closePanel">✕</span>
      </template>
      <div class="panel-content">
        <div class="hint">
          {{ viewerStore.regionZoomActive ? '按住鼠标左键拖拽绘制矩形选区，松开后自动放大' : '点击“开始框选”进入矩形选区模式' }}
        </div>
        <div class="actions">
          <TechButton
            :active="viewerStore.regionZoomActive"
            @click="toggleZoom"
          >
            {{ viewerStore.regionZoomActive ? '取消框选' : '开始框选' }}
          </TechButton>
          <TechButton :disabled="!viewerStore.regionZoomActive" danger @click="resetView">
            重置视角
          </TechButton>
        </div>
      </div>
    </TechPanel>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from '@/composables/useBIMViewer'
import { useDraggable } from '@/composables/useDraggable'
import { useResizable } from '@/composables/useResizable'
import TechPanel from '@/components/common/TechPanel.vue'
import TechButton from '@/components/common/TechButton.vue'

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 260, minHeight: 160 })

function toggleZoom() {
  if (viewerStore.regionZoomActive) {
    viewer.value?.stopRegionZoom()
    viewerStore.setRegionZoomActive(false)
  } else {
    viewer.value?.startRegionZoom()
    viewerStore.setRegionZoomActive(true)
  }
}

function resetView() {
  viewer.value?.resetView()
  viewer.value?.stopRegionZoom()
  viewerStore.setRegionZoomActive(false)
}

function closePanel() {
  viewer.value?.stopRegionZoom()
  viewerStore.setRegionZoomActive(false)
  viewerStore.setShowRegionZoomPanel(false)
}
</script>

<style scoped>
.region-zoom-panel {
  position: absolute;
  left: 16px;
  bottom: calc(var(--status-height) + 280px);
  width: var(--panel-width);
  height: 180px;
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

.hint {
  font-size: 11px;
  color: var(--accent-cyan);
  padding: 6px 8px;
  background: rgba(0, 212, 255, 0.08);
  border-radius: var(--radius-sm);
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
