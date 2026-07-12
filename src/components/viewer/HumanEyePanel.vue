<template>
  <aside
    v-if="viewerStore.modelLoaded && viewerStore.humanEye.open"
    ref="panelRef"
    class="human-eye-panel"
    :style="{ ...dragStyle, ...resizeStyle }"
  >
    <div class="panel-resize-handle" />
    <TechPanel title="人视图">
      <template #extra>
        <span class="close-btn" @click="closePanel">✕</span>
      </template>
      <div class="panel-content">
        <div class="hint">
          {{ hintText }}
        </div>
        <div class="form-row">
          <span class="form-label">眼高 (m)</span>
          <input
            v-model.number="eyeHeightInput"
            type="number"
            min="0"
            max="10"
            step="0.1"
            class="eye-input"
            @change="updateEyeHeight"
          />
        </div>
        <div class="form-row">
          <span class="form-label">显示风格</span>
          <PresetDropdown
            class="preset-select"
            :model-value="viewerStore.humanEye.preset"
            :options="presets"
            placeholder="显示预设"
            @update:model-value="setPreset"
          />
        </div>
        <div class="actions">
          <TechButton
            :active="viewerStore.humanEye.picking"
            @click="togglePicking"
          >
            {{ viewerStore.humanEye.picking ? '取消选点' : '选取点位' }}
          </TechButton>
          <TechButton :disabled="!viewerStore.humanEye.target" @click="recenter">
            回到该点
          </TechButton>
        </div>
        <div ref="viewportRef" class="viewport-container" />
      </div>
    </TechPanel>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import * as THREE from 'three'
import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from '@/composables/useBIMViewer'
import { useDraggable } from '@/composables/useDraggable'
import { useResizable } from '@/composables/useResizable'
import TechPanel from '@/components/common/TechPanel.vue'
import TechButton from '@/components/common/TechButton.vue'
import PresetDropdown from '@/components/common/PresetDropdown.vue'
import { HumanEyeViewport } from '@/core/humaneye/HumanEyeViewport'
import type { RenderPreset } from '@/types'

const viewerStore = useViewerStore()
const panelRef = ref<HTMLElement | null>(null)
const viewportRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef)
const { style: resizeStyle } = useResizable(panelRef, { minWidth: 320, minHeight: 320 })

const eyeHeightInput = ref(viewerStore.humanEye.eyeHeight)
let viewport: HumanEyeViewport | null = null

const presets: { key: RenderPreset; name: string }[] = [
  { key: 'solid', name: '实体着色' },
  { key: 'discipline', name: '专业单色' },
  { key: 'system', name: '系统分区' },
  { key: 'wireframe-solid', name: '线框实体' },
  { key: 'hidden-wireframe', name: '消隐线框' },
  { key: 'transparency', name: '透明度分级' },
  { key: 'highlight-type', name: '类型高亮' },
  { key: 'section-cut', name: '剖切着色' },
]

const hintText = computed(() => {
  if (viewerStore.humanEye.picking) return '请在主视图中点击模型上的一点作为观察位置'
  if (!viewerStore.humanEye.target) return '点击“选取点位”后在模型上取点'
  return '滚轮缩放 · 右键旋转 · 左键平移'
})

watch(
  () => viewerStore.humanEye.open,
  async (open) => {
    if (open) {
      await nextTick()
      if (viewportRef.value && !viewport) {
        viewport = new HumanEyeViewport(viewportRef.value, viewer.value!)
        if (viewerStore.humanEye.target) {
          const t = viewerStore.humanEye.target
          viewport.setTarget(new THREE.Vector3(t.x, t.y, t.z), viewerStore.humanEye.eyeHeight)
        }
      }
    } else {
      viewport?.dispose()
      viewport = null
    }
  }
)

watch(
  () => viewerStore.humanEye.target,
  (target) => {
    if (viewport && target) {
      viewport.setTarget(new THREE.Vector3(target.x, target.y, target.z), viewerStore.humanEye.eyeHeight)
    }
  }
)

watch(
  () => viewerStore.humanEye.eyeHeight,
  (height) => {
    eyeHeightInput.value = height
    viewport?.setEyeHeight(height)
  }
)

watch(
  () => viewerStore.humanEye.preset,
  (preset) => {
    viewport?.setPreset(preset)
  }
)

function togglePicking() {
  viewerStore.setHumanEyePicking(!viewerStore.humanEye.picking)
}

function updateEyeHeight() {
  const height = Math.max(0, Math.min(10, Number(eyeHeightInput.value) || 1.6))
  eyeHeightInput.value = height
  viewerStore.setHumanEyeHeight(height)
}

function setPreset(value: string) {
  viewerStore.setHumanEyePreset(value as RenderPreset)
}

function recenter() {
  const target = viewerStore.humanEye.target
  if (viewport && target) {
    viewport.setTarget(new THREE.Vector3(target.x, target.y, target.z), viewerStore.humanEye.eyeHeight)
  }
}

function closePanel() {
  viewerStore.setHumanEyePicking(false)
  viewerStore.setHumanEyeOpen(false)
}
</script>

<style scoped>
.human-eye-panel {
  position: absolute;
  right: 16px;
  top: calc(var(--header-height) + 16px);
  width: 400px;
  height: 360px;
  max-height: calc(100vh - var(--header-height) - var(--status-height) - 32px);
  overflow: hidden;
  z-index: 52;
}

.human-eye-panel :deep(.tech-panel) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.human-eye-panel :deep(.tech-panel-body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding-right: 4px;
}

.hint {
  font-size: 11px;
  color: var(--accent-cyan);
  padding: 6px 8px;
  background: rgba(0, 212, 255, 0.08);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  flex-shrink: 0;
}

.form-label {
  color: var(--text-secondary);
}

.eye-input {
  width: 80px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 12px;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  flex-shrink: 0;
}

.preset-select {
  flex: 1;
  min-width: 0;
}

.viewport-container {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-primary);
}
</style>
