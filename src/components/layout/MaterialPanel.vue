<template>
  <aside
    v-if="viewerStore.modelLoaded && viewerStore.showMaterialPanel"
    ref="panelRef"
    class="material-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="PBR 材质">
      <template #extra>
        <span class="close-btn" @click="viewerStore.setShowMaterialPanel(false)">✕</span>
      </template>
      <div class="panel-content">
        <div class="material-selector">
          <select v-model="selectedUuid">
            <option value="">选择材质…</option>
            <option v-for="mat in materials" :key="mat.uuid" :value="mat.uuid">
              {{ mat.name }} ({{ mat.type }})
            </option>
          </select>
        </div>

        <div v-if="currentMaterial" class="material-form">
          <div class="form-row">
            <span class="form-label">Base Color</span>
            <ColorPicker :model-value="currentMaterial.color" @update:model-value="update('color', $event)" />
          </div>
          <TechSlider
            :model-value="currentMaterial.metalness"
            label="Metalness"
            :min="0"
            :max="1"
            :step="0.01"
            :display-value="Math.round(currentMaterial.metalness * 100) + '%'"
            @update:model-value="update('metalness', $event)"
          />
          <TechSlider
            :model-value="currentMaterial.roughness"
            label="Roughness"
            :min="0"
            :max="1"
            :step="0.01"
            :display-value="Math.round(currentMaterial.roughness * 100) + '%'"
            @update:model-value="update('roughness', $event)"
          />
          <TechSlider
            :model-value="currentMaterial.normalScale"
            label="Normal Scale"
            :min="0"
            :max="2"
            :step="0.01"
            @update:model-value="update('normalScale', $event)"
          />
          <TechSlider
            :model-value="currentMaterial.emissiveIntensity"
            label="Emissive Intensity"
            :min="0"
            :max="2"
            :step="0.01"
            @update:model-value="update('emissiveIntensity', $event)"
          />
          <TechSlider
            :model-value="currentMaterial.opacity"
            label="Opacity"
            :min="0"
            :max="1"
            :step="0.01"
            :display-value="Math.round(currentMaterial.opacity * 100) + '%'"
            @update:model-value="update('opacity', $event)"
          />
          <label class="form-row checkbox-row">
            <input
              type="checkbox"
              :checked="currentMaterial.transparent"
              @change="update('transparent', ($event.target as HTMLInputElement).checked)"
            />
            <span>Transparent</span>
          </label>

          <div class="form-actions">
            <TechButton @click="resetMaterial">重置当前材质</TechButton>
            <TechButton @click="resetAll">重置全部</TechButton>
          </div>
        </div>
        <div v-else class="empty-tip">请选择可编辑材质</div>
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
import TechButton from '@/components/common/TechButton.vue'
import TechSlider from '@/components/common/TechSlider.vue'
import ColorPicker from '@/components/common/ColorPicker.vue'
import type { MaterialInfo } from '@/types'

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 280, minHeight: 240 })

const materials = ref<MaterialInfo[]>([])
const selectedUuid = ref('')

const currentMaterial = computed<MaterialInfo | null>(() => {
  if (!selectedUuid.value) return null
  return viewer.value?.getMaterialInfo(selectedUuid.value) || null
})

function refreshMaterials() {
  materials.value = viewer.value?.getMaterials() || []
  if (selectedUuid.value && !materials.value.some((m) => m.uuid === selectedUuid.value)) {
    selectedUuid.value = ''
  }
}

function update(key: keyof MaterialInfo, value: unknown) {
  if (!selectedUuid.value) return
  viewer.value?.setMaterialValue(selectedUuid.value, key, value)
  refreshMaterials()
}

function resetMaterial() {
  if (!selectedUuid.value) return
  viewer.value?.resetMaterial(selectedUuid.value)
  refreshMaterials()
}

function resetAll() {
  viewer.value?.resetAllMaterials()
  refreshMaterials()
}

watch(() => viewerStore.modelLoaded, (loaded) => {
  if (loaded) {
    refreshMaterials()
  } else {
    materials.value = []
    selectedUuid.value = ''
  }
})

watch(() => viewerStore.selectedMaterialUuid, (uuid) => {
  if (uuid) selectedUuid.value = uuid
})
</script>

<style scoped>
.material-panel {
  position: absolute;
  left: 16px;
  top: calc(var(--header-height) + 16px);
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
  gap: 10px;
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

.material-selector select {
  width: 100%;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 12px;
}

.material-selector select option,
.material-selector select optgroup {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.material-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.form-label {
  color: var(--text-secondary);
}

.checkbox-row {
  justify-content: flex-start;
  cursor: pointer;
  color: var(--text-primary);
}

.checkbox-row input[type='checkbox'] {
  accent-color: var(--accent-cyan);
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.form-actions .tech-button {
  flex: 1;
  padding: 5px 8px;
  font-size: 11px;
}

.empty-tip {
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  padding: 16px 0;
}
</style>
