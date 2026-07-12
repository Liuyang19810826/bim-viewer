<template>
  <aside
    v-if="settingsStore.general.propertyPanelVisible && viewerStore.selectedComponent"
    ref="panelRef"
    class="property-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="构件属性">
      <template #extra>
        <span class="close-btn" @click="viewerStore.selectComponent(null)">✕</span>
      </template>
      <div class="property-scroll-body">
        <div class="component-summary">
          <div class="component-name">{{ viewerStore.selectedComponent.name }}</div>
          <div class="component-type">{{ viewerStore.selectedComponent.type }}</div>
        </div>

        <div class="component-controls">
          <h4>图元显示设置</h4>
          <label class="control-row">
            <input
              type="checkbox"
              :checked="isHidden"
              @change="toggleVisibility"
            />
            <span>隐藏</span>
          </label>

          <TechSlider
            :model-value="opacity"
            label="透明度"
            :min="0"
            :max="1"
            :step="0.01"
            :display-value="Math.round(opacity * 100) + '%'"
            @update:model-value="setOpacity"
          />

          <div class="control-row color-row">
            <span>渲染颜色</span>
            <ColorPicker v-model="selectedColor" @update:model-value="setColor" />
          </div>
        </div>

        <div class="property-list">
          <div
            v-for="prop in viewerStore.selectedComponent.properties"
            :key="prop.key"
            class="property-row"
          >
            <div class="property-key">{{ prop.key }}</div>
            <div class="property-value">{{ formatValue(prop.value) }}</div>
          </div>
        </div>
      </div>
    </TechPanel>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { viewer } from '@/composables/useBIMViewer'
import { useDraggable } from '@/composables/useDraggable'
import { useResizable } from '@/composables/useResizable'
import TechPanel from '@/components/common/TechPanel.vue'
import TechSlider from '@/components/common/TechSlider.vue'
import ColorPicker from '@/components/common/ColorPicker.vue'

const viewerStore = useViewerStore()
const settingsStore = useSettingsStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 260, minHeight: 240 })

const isHidden = ref(false)
const opacity = ref(1)
const selectedColor = ref('')

function refreshControls() {
  const id = viewerStore.selectedComponent?.id
  if (!id) return
  isHidden.value = !(viewer.value?.getComponentVisibility(id) ?? true)
  opacity.value = viewer.value?.getComponentOpacity(id) ?? 1
  selectedColor.value = ''
}

watch(() => viewerStore.selectedComponent?.id, refreshControls, { immediate: true })

function toggleVisibility(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  isHidden.value = checked
  const id = viewerStore.selectedComponent?.id
  if (id) {
    viewer.value?.setComponentVisibility(id, !checked)
  }
}

function setOpacity(value: number) {
  opacity.value = value
  const id = viewerStore.selectedComponent?.id
  if (id) {
    viewer.value?.setComponentOpacity(id, value)
  }
}

function setColor(color: string) {
  selectedColor.value = color
  const id = viewerStore.selectedComponent?.id
  if (id) {
    viewer.value?.setComponentColor(id, color)
  }
}

function formatValue(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return '-'
  return String(value)
}
</script>

<style scoped>
.property-panel {
  position: absolute;
  right: 16px;
  top: calc(var(--header-height) + 172px);
  width: var(--panel-width);
  max-height: calc(100% - var(--header-height) - var(--status-height) - 80px);
  z-index: 50;
}

.property-scroll-body {
  max-height: calc(100vh - var(--header-height) - var(--status-height) - 220px);
  overflow-y: auto;
  padding-right: 4px;
}

.property-scroll-body::-webkit-scrollbar {
  width: 6px;
}

.property-scroll-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

.property-scroll-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
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

.component-summary {
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--bg-panel-border);
}

.component-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-cyan);
  margin-bottom: 4px;
}

.component-type {
  font-size: 12px;
  color: var(--text-secondary);
}

.property-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.property-key {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.property-value {
  color: var(--text-primary);
  text-align: right;
  word-break: break-all;
}

.component-controls {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--bg-panel-border);
}

.component-controls h4 {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--accent-cyan);
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.control-row input[type='checkbox'] {
  accent-color: var(--accent-cyan);
}

.color-row {
  justify-content: space-between;
}
</style>
