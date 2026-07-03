<template>
  <div class="settings-section">
    <h4>显示预设方案</h4>
    <div class="preset-grid">
      <button
        v-for="preset in presets"
        :key="preset.key"
        class="preset-button"
        :class="{ active: settingsStore.render.preset === preset.key }"
        @click="selectPreset(preset.key)"
      >
        <div class="preset-name">{{ preset.name }}</div>
        <div class="preset-desc">{{ preset.desc }}</div>
      </button>
    </div>

    <h4>材质参数</h4>
    <TechSlider
      v-model="settingsStore.render.metalness"
      label="金属度"
      :min="0"
      :max="1"
      :step="0.01"
      :display-value="settingsStore.render.metalness.toFixed(2)"
      @update:model-value="apply"
    />
    <TechSlider
      v-model="settingsStore.render.roughness"
      label="粗糙度"
      :min="0"
      :max="1"
      :step="0.01"
      :display-value="settingsStore.render.roughness.toFixed(2)"
      @update:model-value="apply"
    />
    <TechSlider
      v-model="settingsStore.render.opacity"
      label="透明度"
      :min="0"
      :max="1"
      :step="0.01"
      :display-value="settingsStore.render.opacity.toFixed(2)"
      @update:model-value="apply"
    />
    <TechSlider
      v-model="settingsStore.render.emissiveIntensity"
      label="自发光强度"
      :min="0"
      :max="2"
      :step="0.01"
      :display-value="settingsStore.render.emissiveIntensity.toFixed(2)"
      @update:model-value="apply"
    />

    <h4>色调与色彩</h4>
    <div class="toggle-list">
      <TechToggle v-model="settingsStore.render.acesToneMapping" label="ACES 色调映射" @change="apply" />
      <TechToggle v-model="settingsStore.render.srgbOutput" label="sRGB 色彩空间" @change="apply" />
    </div>
    <TechSlider
      v-model="settingsStore.render.acesIntensity"
      label="色调强度"
      :min="0.1"
      :max="3"
      :step="0.1"
      :display-value="settingsStore.render.acesIntensity.toFixed(1)"
      @update:model-value="apply"
    />
    <TechSlider
      v-model="settingsStore.render.brightness"
      label="亮度"
      :min="0"
      :max="2"
      :step="0.05"
      :display-value="settingsStore.render.brightness.toFixed(2)"
      @update:model-value="apply"
    />
    <TechSlider
      v-model="settingsStore.render.contrast"
      label="对比度"
      :min="0"
      :max="2"
      :step="0.05"
      :display-value="settingsStore.render.contrast.toFixed(2)"
      @update:model-value="apply"
    />

    <h4>后处理特效</h4>
    <div class="toggle-list">
      <TechToggle v-model="settingsStore.render.ssaoEnabled" label="SSAO 环境光遮蔽" @change="apply" />
      <TechToggle v-model="settingsStore.render.fxaaEnabled" label="FXAA 抗锯齿" @change="apply" />
      <TechToggle v-model="settingsStore.render.bloomEnabled" label="Bloom 泛光" @change="apply" />
    </div>
    <TechSlider
      v-model="settingsStore.render.bloomStrength"
      label="泛光强度"
      :min="0"
      :max="2"
      :step="0.05"
      :display-value="settingsStore.render.bloomStrength.toFixed(2)"
      @update:model-value="apply"
    />
    <TechSlider
      v-model="settingsStore.render.ssaoRadius"
      label="SSAO 半径"
      :min="0"
      :max="2"
      :step="0.05"
      :display-value="settingsStore.render.ssaoRadius.toFixed(2)"
      @update:model-value="apply"
    />

    <h4>阴影</h4>
    <div class="toggle-list">
      <TechToggle v-model="settingsStore.render.shadowEnabled" label="全局阴影" @change="apply" />
    </div>
    <TechSlider
      v-model="settingsStore.render.shadowResolution"
      label="阴影分辨率"
      :min="512"
      :max="4096"
      :step="512"
      :display-value="settingsStore.render.shadowResolution"
      @update:model-value="apply"
    />
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settingsStore'
import { viewer } from '@/composables/useBIMViewer'
import TechSlider from '@/components/common/TechSlider.vue'
import TechToggle from '@/components/common/TechToggle.vue'
import type { RenderPreset } from '@/types'

const settingsStore = useSettingsStore()

const presets: { key: RenderPreset; name: string; desc: string }[] = [
  { key: 'solid', name: '实体着色', desc: '保留真实材质，按专业基础色渲染' },
  { key: 'discipline', name: '专业单色', desc: '同一专业统一纯色，强对比区分' },
  { key: 'system', name: '系统分区', desc: '同专业内按子系统细分颜色' },
  { key: 'wireframe-solid', name: '线框实体', desc: '半透明实体 + 黑色轮廓边线' },
  { key: 'hidden-wireframe', name: '消隐线框', desc: '无填充，仅保留外轮廓线' },
  { key: 'transparency', name: '透明度分级', desc: '按专业/构件类型设置透明度' },
  { key: 'highlight-type', name: '类型高亮', desc: '目标构件高亮，其余灰度淡化' },
  { key: 'section-cut', name: '剖切着色', desc: '剖切面填充对比色，内部分区显示' },
]

function apply() {
  viewer.value?.applySettings(settingsStore.settings)
}

function selectPreset(key: RenderPreset) {
  viewer.value?.setRenderPreset(key)
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

.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.preset-button {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-button:hover {
  border-color: var(--accent-cyan);
  background: rgba(0, 212, 255, 0.08);
}

.preset-button.active {
  border-color: var(--accent-cyan);
  background: rgba(0, 212, 255, 0.15);
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
}

.preset-name {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}

.preset-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}
</style>
