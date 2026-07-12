<template>
  <aside
    v-if="viewerStore.modelLoaded && viewerStore.showLightingPanel"
    ref="panelRef"
    class="lighting-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="光照系统">
      <template #extra>
        <span class="close-btn" @click="viewerStore.setShowLightingPanel(false)">✕</span>
      </template>
      <div class="panel-content">
        <div class="light-section">
          <div class="section-title">环境光</div>
          <div class="form-row">
            <span class="form-label">颜色</span>
            <ColorPicker :model-value="settings.ambient.color" @update:model-value="updateAmbient('color', $event)" />
          </div>
          <TechSlider
            :model-value="settings.ambient.intensity"
            label="强度"
            :min="0"
            :max="2"
            :step="0.01"
            @update:model-value="updateAmbient('intensity', $event)"
          />
        </div>

        <div class="light-section">
          <div class="section-title">平行光</div>
          <div class="form-row">
            <span class="form-label">颜色</span>
            <ColorPicker :model-value="settings.directional.color" @update:model-value="updateDirectional('color', $event)" />
          </div>
          <TechSlider
            :model-value="settings.directional.intensity"
            label="强度"
            :min="0"
            :max="3"
            :step="0.01"
            @update:model-value="updateDirectional('intensity', $event)"
          />
          <VectorControl label="位置" :value="settings.directional.position" @update="updateDirectionalPosition" />
          <VectorControl label="目标" :value="settings.directional.target" @update="updateDirectionalTarget" />
        </div>

        <div class="light-section">
          <div class="section-title">阴影</div>
          <label class="form-row checkbox-row">
            <input
              type="checkbox"
              :checked="settings.shadow.enabled"
              @change="setShadowEnabled(($event.target as HTMLInputElement).checked)"
            />
            <span>启用阴影</span>
          </label>
          <label class="form-row checkbox-row">
            <input
              type="checkbox"
              :checked="settings.shadow.soft"
              @change="setShadowSoft(($event.target as HTMLInputElement).checked)"
            />
            <span>软阴影</span>
          </label>
          <div class="form-row">
            <span class="form-label">分辨率</span>
            <select :value="settings.shadow.resolution" @change="setShadowResolution(Number(($event.target as HTMLSelectElement).value))">
              <option :value="512">512</option>
              <option :value="1024">1024</option>
              <option :value="2048">2048</option>
              <option :value="4096">4096</option>
            </select>
          </div>
        </div>

        <div v-if="settings.pointLights.length > 0" class="light-section">
          <div class="section-title">点光源</div>
          <div v-for="light in settings.pointLights" :key="light.uuid" class="point-light">
            <span class="light-name">{{ light.name }}</span>
            <TechSlider
              :model-value="light.intensity"
              label="强度"
              :min="0"
              :max="5"
              :step="0.01"
              @update:model-value="setPointLightIntensity(light.uuid, $event)"
            />
          </div>
        </div>
      </div>
    </TechPanel>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from '@/composables/useBIMViewer'
import { useDraggable } from '@/composables/useDraggable'
import { useResizable } from '@/composables/useResizable'
import TechPanel from '@/components/common/TechPanel.vue'
import TechSlider from '@/components/common/TechSlider.vue'
import ColorPicker from '@/components/common/ColorPicker.vue'
import VectorControl from '@/components/common/VectorControl.vue'

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 280, minHeight: 240 })

const settings = computed(() => viewer.value?.getLightSettings() || {
  ambient: { intensity: 0.3, color: '#ffffff' },
  directional: { intensity: 0.8, color: '#ffffff', position: { x: 50, y: 80, z: 50 }, target: { x: 0, y: 0, z: 0 } },
  shadow: { enabled: true, resolution: 2048, soft: true },
  pointLights: [],
})

function updateAmbient(key: 'intensity' | 'color', value: unknown) {
  const ambient = { ...settings.value.ambient, [key]: value }
  viewer.value?.setAmbientLight(ambient.intensity, ambient.color)
}

function updateDirectional(key: 'intensity' | 'color', value: unknown) {
  const directional = { ...settings.value.directional, [key]: value }
  viewer.value?.setDirectionalLight(
    directional.intensity,
    directional.color,
    directional.position,
    directional.target
  )
}

function updateDirectionalPosition(value: { x: number; y: number; z: number }) {
  const directional = { ...settings.value.directional, position: value }
  viewer.value?.setDirectionalLight(
    directional.intensity,
    directional.color,
    directional.position,
    directional.target
  )
}

function updateDirectionalTarget(value: { x: number; y: number; z: number }) {
  const directional = { ...settings.value.directional, target: value }
  viewer.value?.setDirectionalLight(
    directional.intensity,
    directional.color,
    directional.position,
    directional.target
  )
}

function setShadowEnabled(enabled: boolean) {
  viewer.value?.setShadowEnabled(enabled)
}

function setShadowSoft(soft: boolean) {
  viewer.value?.setShadowSoft(soft)
}

function setShadowResolution(resolution: number) {
  viewer.value?.setShadowResolution(resolution)
}

function setPointLightIntensity(uuid: string, intensity: number) {
  viewer.value?.setPointLightIntensity(uuid, intensity)
}

onMounted(() => {
  // ensure current light state is reflected after panel opens
})

watch(() => viewerStore.modelLoaded, (loaded) => {
  if (!loaded) {
    // nothing to reset; settings come from viewer
  }
})
</script>

<style scoped>
.lighting-panel {
  position: absolute;
  left: 16px;
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
  gap: 14px;
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

.light-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--bg-panel-border);
}

.light-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 12px;
  color: var(--accent-cyan);
  font-weight: 600;
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

select {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 12px;
}

.point-light {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
}

.light-name {
  font-size: 12px;
  color: var(--text-primary);
}
</style>
