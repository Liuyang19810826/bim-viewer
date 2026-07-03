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
        ref="fileInput"
        type="file"
        multiple
        accept=".gltf,.glb,.bin"
        style="display: none"
        @change="fileLoader.onFolderSelected"
      />
      <TechButton @click="onLoadModelClick">
        <span>📁</span> 加载模型
      </TechButton>
      <TechButton :disabled="!viewerStore.modelLoaded" @click="resetView">
        <span>↺</span> 重置视角
      </TechButton>
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

      <div class="preset-dropdown" v-if="viewerStore.modelLoaded">
        <select v-model="currentPreset" @change="applyQuickPreset">
          <option value="" disabled>显示预设</option>
          <option v-for="preset in presets" :key="preset.key" :value="preset.key">
            {{ preset.name }}
          </option>
        </select>
      </div>

      <TechButton @click="settingsStore.general.logPanelVisible = !settingsStore.general.logPanelVisible">
        <span>📝</span> 日志
      </TechButton>
      <TechButton @click="showSettings = true">
        <span>⚙</span> 设置
      </TechButton>
      <TechButton danger :disabled="!viewerStore.modelLoaded" @click="clearModel">
        <span>🗑</span> 清空
      </TechButton>
    </div>

    <SettingsDrawer v-model="showSettings" />

    <TechDialog
      v-model="showLoadDialog"
      title="加载模型提示"
      @confirm="confirmLoadModel"
    >
      <p>请选择模型文件，支持 <strong>.gltf / .glb / .bin</strong> 格式。</p>
      <p>若模型资源分散在文件夹中，可在文件选择框中进入文件夹并多选所有相关文件。</p>
    </TechDialog>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { MODE_LABELS } from '@/utils/constants'
import TechButton from '@/components/common/TechButton.vue'
import TechDialog from '@/components/common/TechDialog.vue'
import SettingsDrawer from '@/components/settings/SettingsDrawer.vue'
import { useFileLoader } from '@/composables/useFileLoader'
import { viewer } from '@/composables/useBIMViewer'
import type { RenderPreset } from '@/types'

const viewerStore = useViewerStore()
const settingsStore = useSettingsStore()
const showSettings = ref(false)
const showLoadDialog = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const fileLoader = useFileLoader(fileInput)

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

const currentPreset = computed(() => settingsStore.render.preset)

function applyQuickPreset() {
  const preset = currentPreset.value
  if (preset) {
    viewer.value?.setRenderPreset(preset)
  }
}

function onLoadModelClick() {
  showLoadDialog.value = true
}

function confirmLoadModel() {
  nextTick(() => {
    fileLoader.openFolderPicker()
  })
}

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
  display: flex;
  align-items: center;
  gap: 10px;
}

.preset-dropdown select {
  height: 32px;
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  outline: none;
}

.preset-dropdown select:hover,
.preset-dropdown select:focus {
  border-color: var(--accent-cyan);
}
</style>
