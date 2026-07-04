<template>
  <div v-if="viewerStore.modelLoaded && viewerStore.floors.length > 0" class="floor-bar">
    <span class="floor-label">楼层</span>
    <label
      v-for="floor in viewerStore.floors"
      :key="floor.key"
      class="floor-tag"
      :class="{ active: floor.key === viewerStore.selectedFloorKey }"
    >
      <input
        type="checkbox"
        :checked="floor.visible"
        @change="toggleFloor(floor.key, ($event.target as HTMLInputElement).checked)"
      />
      <span class="floor-name" @click.stop="selectFloor(floor.key)">{{ floor.name }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from '@/composables/useBIMViewer'

const viewerStore = useViewerStore()

function toggleFloor(key: string, visible: boolean) {
  viewer.value?.setFloorVisibility(key, visible)
}

function selectFloor(key: string) {
  viewerStore.selectFloor(key)
}
</script>

<style scoped>
.floor-bar {
  position: absolute;
  top: calc(var(--header-height) + 12px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(5, 8, 15, 0.85);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-md);
  backdrop-filter: blur(8px);
  z-index: 60;
}

.floor-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
}

.floor-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 12px;
  color: var(--text-primary);
}

.floor-tag:hover,
.floor-tag.active {
  border-color: var(--accent-cyan);
  background: rgba(0, 212, 255, 0.1);
}

.floor-tag input[type='checkbox'] {
  accent-color: var(--accent-cyan);
  cursor: pointer;
}

.floor-name {
  cursor: pointer;
  user-select: none;
}
</style>
