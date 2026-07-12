<template>
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-icon">◈</span>
        <span class="logo-text">BIM VIEWER</span>
      </div>
      <div class="header-divider" />
      <div class="mode-badge" :class="viewerStore.mode">
        {{ MODE_LABELS[viewerStore.mode] }}
      </div>
    </div>

    <div class="header-actions">
      <input
        ref="glbInput"
        type="file"
        accept=".glb"
        style="display: none"
        @change="glbLoader.onFolderSelected"
      />
      <input
        ref="gltfInput"
        type="file"
        multiple
        accept=".gltf,.bin"
        style="display: none"
        @change="gltfLoader.onFolderSelected"
      />

      <div class="header-row header-row--primary">
        <TechButton @click="glbLoader.openFolderPicker">
          <span>📁</span> 加载 GLB
        </TechButton>
        <TechButton @click="gltfLoader.openFolderPicker">
          <span>📁</span> 加载 GLTF
        </TechButton>
        <TechButton :disabled="!viewerStore.modelLoaded" @click="resetView">
          <span>↺</span> 重置视角
        </TechButton>
        <TechButton @click="settingsStore.general.logPanelVisible = !settingsStore.general.logPanelVisible">
          <span>📝</span> 日志
        </TechButton>
        <TechButton
          :active="viewerStore.showModelStatsPanel"
          :disabled="!viewerStore.modelLoaded"
          @click="viewerStore.setShowModelStatsPanel(!viewerStore.showModelStatsPanel)"
        >
          <span>📊</span> 统计
        </TechButton>
        <TechButton
          danger
          :disabled="!viewerStore.modelLoaded"
          @click="clearModel"
        >
          <span>🗑</span> 清空
        </TechButton>
        <TechButton
          :active="viewerStore.showValidationPanel"
          :disabled="!viewerStore.modelLoaded"
          @click="viewerStore.setShowValidationPanel(!viewerStore.showValidationPanel)"
        >
          <span>✓</span> 校验
        </TechButton>
        <TechButton
          :active="viewerStore.showPerformancePanel"
          :disabled="!viewerStore.modelLoaded"
          @click="viewerStore.setShowPerformancePanel(!viewerStore.showPerformancePanel)"
        >
          <span>📈</span> 性能
        </TechButton>
        <TechButton @click="showSettings = true">
          <span>⚙</span> 设置
        </TechButton>
      </div>

      <div class="header-row header-row--secondary">
        <TechButton
          :active="viewerStore.isClipping"
          :disabled="!viewerStore.modelLoaded"
          @click="toggleClipping"
        >
          <span>✂</span> {{ viewerStore.isClipping ? '关闭剖切' : '开启剖切' }}
        </TechButton>
        <TechButton
          :active="viewerStore.isRoaming"
          :disabled="!viewerStore.modelLoaded"
          @click="toggleRoaming"
        >
          <span>🚶</span> {{ viewerStore.isRoaming ? '退出漫游' : '开启漫游' }}
        </TechButton>
        <TechButton
          :active="settingsStore.general.floorPanelVisible"
          :disabled="!viewerStore.modelLoaded"
          @click="settingsStore.general.floorPanelVisible = !settingsStore.general.floorPanelVisible"
        >
          <span>🏢</span> 楼层
        </TechButton>
        <TechButton
          :active="viewerStore.showSceneTreePanel"
          :disabled="!viewerStore.modelLoaded"
          @click="viewerStore.setShowSceneTreePanel(!viewerStore.showSceneTreePanel)"
        >
          <span>🌳</span> 场景树
        </TechButton>
        <TechButton
          :active="viewerStore.showNodePropertiesPanel"
          :disabled="!viewerStore.modelLoaded"
          @click="viewerStore.setShowNodePropertiesPanel(!viewerStore.showNodePropertiesPanel)"
        >
          <span>📋</span> 属性
        </TechButton>
        <TechButton
          :active="viewerStore.showMaterialPanel"
          :disabled="!viewerStore.modelLoaded"
          @click="viewerStore.setShowMaterialPanel(!viewerStore.showMaterialPanel)"
        >
          <span>🎨</span> 材质
        </TechButton>
        <TechButton
          :active="viewerStore.showLightingPanel"
          :disabled="!viewerStore.modelLoaded"
          @click="viewerStore.setShowLightingPanel(!viewerStore.showLightingPanel)"
        >
          <span>💡</span> 光照
        </TechButton>
        <TechButton
          :active="viewerStore.showPostProcessingPanel"
          :disabled="!viewerStore.modelLoaded"
          @click="viewerStore.setShowPostProcessingPanel(!viewerStore.showPostProcessingPanel)"
        >
          <span>✨</span> 后处理
        </TechButton>
        <TechButton
          :active="viewerStore.showMeasurementPanel"
          :disabled="!viewerStore.modelLoaded"
          @click="toggleMeasurementPanel"
        >
          <span>📏</span> 测量
        </TechButton>
        <PresetDropdown
          v-if="viewerStore.modelLoaded"
          v-model="currentPreset"
          :options="presets"
          placeholder="显示预设"
        />
        <TechButton
          :active="viewerStore.showRegionZoomPanel"
          :disabled="!viewerStore.modelLoaded"
          @click="viewerStore.setShowRegionZoomPanel(!viewerStore.showRegionZoomPanel)"
        >
          <span>🔍</span> 近景查看
        </TechButton>
        <TechButton
          :active="viewerStore.humanEye.open"
          :disabled="!viewerStore.modelLoaded"
          @click="viewerStore.setHumanEyeOpen(!viewerStore.humanEye.open)"
        >
          <span>👁</span> 人视图
        </TechButton>
      </div>
    </div>

    <SettingsDrawer v-model="showSettings" />
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { MODE_LABELS } from '@/utils/constants'
import TechButton from '@/components/common/TechButton.vue'
import PresetDropdown from '@/components/common/PresetDropdown.vue'
import SettingsDrawer from '@/components/settings/SettingsDrawer.vue'
import { useFileLoader } from '@/composables/useFileLoader'
import { viewer } from '@/composables/useBIMViewer'
import type { RenderPreset } from '@/types'

const viewerStore = useViewerStore()
const settingsStore = useSettingsStore()
const showSettings = ref(false)
const glbInput = ref<HTMLInputElement | null>(null)
const gltfInput = ref<HTMLInputElement | null>(null)

const glbLoader = useFileLoader(glbInput)
const gltfLoader = useFileLoader(gltfInput)

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

const currentPreset = computed({
  get: () => settingsStore.render.preset,
  set: (preset) => {
    viewer.value?.setRenderPreset(preset)
  },
})

function resetView() {
  viewer.value?.resetView()
}

function toggleClipping() {
  viewer.value?.toggleClipping()
}

function toggleRoaming() {
  viewer.value?.toggleRoaming()
}

function clearModel() {
  viewer.value?.clearModel()
}

function toggleMeasurementPanel() {
  const next = !viewerStore.showMeasurementPanel
  viewerStore.setShowMeasurementPanel(next)
  if (!next) {
    viewer.value?.stopMeasurement()
  }
}
</script>

<style scoped>
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: rgba(5, 8, 15, 0.95);
  border-bottom: 1px solid var(--bg-panel-border);
  backdrop-filter: blur(12px);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 2px;
}

.logo-icon {
  color: var(--accent-cyan);
  font-size: 20px;
  text-shadow: 0 0 12px rgba(0, 212, 255, 0.6);
}

.header-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
}

.mode-badge {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.mode-badge.view {
  color: var(--text-secondary);
}

.mode-badge.clip {
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
  background: rgba(0, 212, 255, 0.1);
}

.mode-badge.roam {
  color: var(--success);
  border-color: var(--success);
  background: rgba(16, 185, 129, 0.1);
}

.header-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.header-row {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  justify-content: flex-end;
}

.app-header .tech-button {
  padding: 5px 10px;
  font-size: 12px;
  border-radius: var(--radius-sm);
  gap: 4px;
  white-space: nowrap;
}

.app-header :deep(.preset-dropdown .dropdown-trigger) {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  border-radius: var(--radius-sm);
}
</style>
