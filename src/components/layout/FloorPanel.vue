<template>
  <aside
    v-if="floor"
    ref="panelRef"
    class="floor-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel :title="`楼层属性 - ${floor.name}`">
      <template #extra>
        <span class="close-btn" @click="viewerStore.selectFloor(null)">✕</span>
      </template>

      <label class="control-row">
        <input
          type="checkbox"
          :checked="floor.visible"
          @change="toggleVisibility"
        />
        <span>显示楼层</span>
      </label>

      <TechSlider
        :model-value="floorOpacity"
        label="透明度"
        :min="0"
        :max="1"
        :step="0.01"
        :display-value="Math.round(floorOpacity * 100) + '%'"
        @update:model-value="setOpacity"
      />

      <div class="control-row color-row">
        <span>渲染颜色</span>
        <ColorPicker v-model="selectedColor" @update:model-value="setColor" />
      </div>

      <div class="floor-info">
        <div class="info-row">
          <span>图元数量</span>
          <span>{{ floor.ids.length }}</span>
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
import TechSlider from '@/components/common/TechSlider.vue'
import ColorPicker from '@/components/common/ColorPicker.vue'

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 240, minHeight: 200 })

const floor = computed(() => viewerStore.floors.find((f) => f.key === viewerStore.selectedFloorKey))
const floorOpacity = ref(1)
const selectedColor = ref('')

watch(floor, (f) => {
  if (f) floorOpacity.value = f.opacity
}, { immediate: true })

function toggleVisibility(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (floor.value) {
    viewer.value?.setFloorVisibility(floor.value.key, checked)
  }
}

function setOpacity(value: number) {
  floorOpacity.value = value
  if (floor.value) {
    viewer.value?.setFloorOpacity(floor.value.key, value)
  }
}

function setColor(color: string) {
  selectedColor.value = color
  if (floor.value) {
    viewer.value?.setFloorColor(floor.value.key, color)
  }
}
</script>

<style scoped>
.floor-panel {
  position: absolute;
  right: 16px;
  top: calc(var(--header-height) + 420px);
  width: var(--panel-width);
  z-index: 50;
}

.close-btn {
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
}

.close-btn:hover {
  color: var(--danger);
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.control-row input[type='checkbox'] {
  accent-color: var(--accent-cyan);
}

.color-row {
  justify-content: space-between;
}

.floor-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--bg-panel-border);
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
