<template>
  <Transition name="fade">
    <div v-if="viewerStore.isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner" />
        <div class="loading-text">模型加载中 {{ viewerStore.loadProgress.percentage }}%</div>
        <div class="loading-bar">
          <div class="loading-progress" :style="{ width: `${viewerStore.loadProgress.percentage}%` }" />
        </div>
        <div class="loading-detail">
          {{ formatBytes(viewerStore.loadProgress.loaded) }} / {{ formatBytes(viewerStore.loadProgress.total) }}
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useViewerStore } from '@/stores/viewerStore'

const viewerStore = useViewerStore()

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(2)} ${units[i]}`
}
</script>

<style scoped>
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 8, 15, 0.85);
  backdrop-filter: blur(4px);
  z-index: 80;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 48px;
  background: var(--bg-panel);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-panel);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(0, 212, 255, 0.2);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-cyan);
  letter-spacing: 1px;
}

.loading-bar {
  width: 240px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.loading-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan));
  transition: width 0.2s ease;
}

.loading-detail {
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
