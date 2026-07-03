<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="modelValue" class="settings-overlay" @click.self="close">
        <div class="settings-drawer">
          <div class="settings-header">
            <h3>系统设置</h3>
            <span class="close-btn" @click="close">✕</span>
          </div>
          <div class="settings-tabs">
            <div
              v-for="tab in tabs"
              :key="tab.key"
              class="settings-tab"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </div>
          </div>
          <div class="settings-body">
            <GeneralSettings v-if="activeTab === 'general'" />
            <RenderSettings v-if="activeTab === 'render'" />
          </div>
          <div class="settings-footer">
            <TechButton danger @click="resetCurrent">恢复当前默认</TechButton>
            <TechButton @click="resetAll">恢复全部默认</TechButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import TechButton from '@/components/common/TechButton.vue'
import GeneralSettings from './GeneralSettings.vue'
import RenderSettings from './RenderSettings.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const settingsStore = useSettingsStore()
const activeTab = ref('general')

const tabs = [
  { key: 'general', label: '通用' },
  { key: 'render', label: '渲染特效' },
]

function close() {
  emit('update:modelValue', false)
}

function resetCurrent() {
  if (activeTab.value === 'general') {
    settingsStore.resetGeneral()
  } else {
    settingsStore.resetRender()
  }
}

function resetAll() {
  settingsStore.resetAll()
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.settings-drawer {
  width: 420px;
  height: 100%;
  background: var(--bg-secondary);
  border-left: 1px solid var(--bg-panel-border);
  box-shadow: var(--shadow-panel);
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--bg-panel-border);
}

.settings-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--accent-cyan);
  letter-spacing: 1px;
}

.close-btn {
  color: var(--text-muted);
  cursor: pointer;
}

.close-btn:hover {
  color: var(--danger);
}

.settings-tabs {
  display: flex;
  border-bottom: 1px solid var(--bg-panel-border);
}

.settings-tab {
  flex: 1;
  padding: 12px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.settings-tab.active {
  color: var(--accent-cyan);
  border-bottom: 2px solid var(--accent-cyan);
  background: rgba(0, 212, 255, 0.05);
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.settings-footer {
  display: flex;
  gap: 10px;
  padding: 16px;
  border-top: 1px solid var(--bg-panel-border);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-enter-active .settings-drawer,
.drawer-leave-active .settings-drawer {
  transition: transform 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .settings-drawer,
.drawer-leave-to .settings-drawer {
  transform: translateX(100%);
}
</style>
