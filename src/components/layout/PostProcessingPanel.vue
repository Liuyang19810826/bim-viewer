<template>
  <aside
    v-if="viewerStore.modelLoaded && viewerStore.showPostProcessingPanel"
    ref="panelRef"
    class="post-processing-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="后处理">
      <template #extra>
        <span class="close-btn" @click="viewerStore.setShowPostProcessingPanel(false)">✕</span>
      </template>
      <div class="panel-content">
        <div class="pp-section">
          <label class="pp-row">
            <span>FXAA 抗锯齿</span>
            <TechToggle :model-value="render.fxaaEnabled" @update:model-value="updateRender({ fxaaEnabled: $event })" />
          </label>
          <label class="pp-row">
            <span>SSAO 环境光遮蔽</span>
            <TechToggle :model-value="render.ssaoEnabled" @update:model-value="updateRender({ ssaoEnabled: $event })" />
          </label>
          <TechSlider
            :model-value="render.ssaoIntensity"
            label="SSAO 强度"
            :min="0"
            :max="3"
            :step="0.05"
            @update:model-value="updateRender({ ssaoIntensity: $event })"
          />
          <label class="pp-row">
            <span>ACES 色调映射</span>
            <TechToggle :model-value="render.acesToneMapping" @update:model-value="updateRender({ acesToneMapping: $event })" />
          </label>
          <TechSlider
            :model-value="render.acesIntensity"
            label="色调映射强度"
            :min="0"
            :max="3"
            :step="0.05"
            @update:model-value="updateRender({ acesIntensity: $event })"
          />
        </div>
      </div>
    </TechPanel>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { viewer } from '@/composables/useBIMViewer'
import { useDraggable } from '@/composables/useDraggable'
import { useResizable } from '@/composables/useResizable'
import TechPanel from '@/components/common/TechPanel.vue'
import TechSlider from '@/components/common/TechSlider.vue'
import TechToggle from '@/components/common/TechToggle.vue'
import type { RenderSettings } from '@/types'

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 260, minHeight: 180 })

const settingsStore = useSettingsStore()
const render = settingsStore.render

function updateRender(partial: Partial<RenderSettings>) {
  viewer.value?.applyPostProcessingSettings(partial)
}
</script>

<style scoped>
.post-processing-panel {
  position: absolute;
  right: 16px;
  bottom: calc(var(--status-height) + 16px);
  width: var(--panel-width);
  height: 220px;
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
  max-height: calc(100% - 48px);
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

.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.pp-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
}
</style>
