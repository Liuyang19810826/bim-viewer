<template>
  <aside
    v-if="viewerStore.modelLoaded && viewerStore.floors.length > 0 && settingsStore.general.floorPanelVisible"
    ref="panelRef"
    class="floor-list-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="楼层显示">
      <template #extra>
        <span class="close-btn" @click="settingsStore.updateGeneral({ floorPanelVisible: false })">✕</span>
      </template>

      <div class="floor-actions">
        <TechButton @click="showAll">全部显示</TechButton>
        <TechButton @click="hideAll">全部隐藏</TechButton>
      </div>

      <div class="floor-list">
        <div
          v-for="floor in viewerStore.floors"
          :key="floor.key"
          class="floor-row"
          :class="{ active: floor.key === viewerStore.selectedFloorKey }"
          @click="selectFloor(floor.key)"
        >
          <input
            type="checkbox"
            :checked="floor.visible"
            @click.stop
            @change="toggleFloor(floor.key, ($event.target as HTMLInputElement).checked)"
          />
          <span class="floor-name">{{ floor.name }}</span>
          <span class="floor-count">{{ floor.ids.length }}</span>
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
import TechButton from '@/components/common/TechButton.vue'

const viewerStore = useViewerStore()
const settingsStore = useSettingsStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 220, minHeight: 160 })

function toggleFloor(key: string, visible: boolean) {
  viewer.value?.setFloorVisibility(key, visible)
}

function selectFloor(key: string) {
  viewerStore.selectFloor(key)
}

function showAll() {
  viewerStore.floors.forEach((f) => viewer.value?.setFloorVisibility(f.key, true))
}

function hideAll() {
  viewerStore.floors.forEach((f) => viewer.value?.setFloorVisibility(f.key, false))
}
</script>

<style scoped>
.floor-list-panel {
  position: absolute;
  left: calc(50% - 130px);
  top: calc(var(--header-height) + 16px);
  width: 260px;
  max-height: calc(100% - var(--status-height) - 32px);
  z-index: 55;
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

.floor-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.floor-actions .tech-button {
  flex: 1;
  padding: 5px 8px;
  font-size: 12px;
}

.floor-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: calc(100vh - var(--header-height) - var(--status-height) - 220px);
  overflow-y: auto;
  padding-right: 4px;
}

.floor-list::-webkit-scrollbar {
  width: 6px;
}

.floor-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

.floor-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.floor-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.floor-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
  font-size: 12px;
}

.floor-row:hover {
  background: rgba(0, 212, 255, 0.08);
}

.floor-row.active {
  background: rgba(0, 212, 255, 0.15);
  border: 1px solid var(--accent-cyan);
}

.floor-row input[type='checkbox'] {
  accent-color: var(--accent-cyan);
  cursor: pointer;
  flex-shrink: 0;
}

.floor-name {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.floor-count {
  color: var(--text-muted);
  font-size: 11px;
  flex-shrink: 0;
}
</style>
