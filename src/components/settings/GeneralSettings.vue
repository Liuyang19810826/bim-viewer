<template>
  <div class="settings-section">
    <h4>界面与交互</h4>
    <div class="form-row">
      <label>画布背景颜色</label>
      <input v-model="settingsStore.general.backgroundColor" type="color" @change="apply" />
    </div>
    <div class="form-row">
      <label>构件高亮颜色</label>
      <input v-model="settingsStore.general.highlightColor" type="color" @change="apply" />
    </div>
    <TechSlider
      v-model="settingsStore.general.zoomSpeed"
      label="缩放速度"
      :min="0.1"
      :max="3"
      :step="0.1"
      :display-value="settingsStore.general.zoomSpeed.toFixed(1)"
      @update:model-value="apply"
    />
    <TechSlider
      v-model="settingsStore.general.panSensitivity"
      label="拖拽灵敏度"
      :min="0.1"
      :max="3"
      :step="0.1"
      :display-value="settingsStore.general.panSensitivity.toFixed(1)"
      @update:model-value="apply"
    />

    <h4>漫游设置</h4>
    <div class="form-row">
      <label>漫游速度</label>
      <select v-model="settingsStore.general.roamingSpeed" @change="apply">
        <option value="slow">慢速</option>
        <option value="normal">中速</option>
        <option value="fast">快速</option>
      </select>
    </div>

    <h4>面板与提示</h4>
    <div class="toggle-list">
      <TechToggle v-model="settingsStore.general.propertyPanelVisible" label="默认显示属性面板" />
      <TechToggle v-model="settingsStore.general.logPanelVisible" label="默认显示日志面板" />
      <TechToggle v-model="settingsStore.general.floorPanelVisible" label="默认显示楼层面板" />
      <TechToggle v-model="settingsStore.general.loadingAnimation" label="加载动画" />
      <TechToggle v-model="settingsStore.general.operationHints" label="操作提示" />
    </div>

    <h4>API 服务</h4>
    <div class="toggle-list">
      <TechToggle v-model="settingsStore.settings.apiEnabled" label="启用外部 API" />
    </div>
    <div class="form-row">
      <label>授信域名（逗号分隔）</label>
      <textarea v-model="originsText" rows="3" @change="updateOrigins" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { viewer } from '@/composables/useBIMViewer'
import TechSlider from '@/components/common/TechSlider.vue'
import TechToggle from '@/components/common/TechToggle.vue'

const settingsStore = useSettingsStore()
const originsText = ref(settingsStore.settings.allowedOrigins.join(', '))

watch(() => settingsStore.settings.allowedOrigins, (val: string[]) => {
  originsText.value = val.join(', ')
})

function apply() {
  viewer.value?.applySettings(settingsStore.settings)
}

function updateOrigins() {
  const origins = originsText.value.split(',').map((s: string) => s.trim()).filter(Boolean)
  settingsStore.setAllowedOrigins(origins)
}
</script>

<style scoped>
.settings-section h4 {
  margin: 20px 0 12px;
  font-size: 13px;
  color: var(--accent-cyan);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.form-row input[type='color'] {
  width: 48px;
  height: 28px;
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
}

.form-row select,
.form-row textarea {
  flex: 1;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
}

.form-row textarea {
  resize: none;
}

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}
</style>
