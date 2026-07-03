<template>
  <footer class="status-bar">
    <div class="status-left">
      <span class="status-dot" :class="viewerStore.modelLoaded ? 'online' : 'offline'" />
      <span>{{ viewerStore.modelLoaded ? '模型已加载' : '未加载模型' }}</span>
      <span v-if="viewerStore.modelInfo" class="model-info">
        {{ viewerStore.modelInfo.name }} | 构件 {{ viewerStore.modelInfo.componentCount }} | 顶点 {{ formatNumber(viewerStore.modelInfo.vertexCount) }} | 三角面 {{ formatNumber(viewerStore.modelInfo.triangleCount) }}
      </span>
    </div>
    <div class="status-center">
      {{ viewerStore.statusMessage }}
    </div>
    <div class="status-right">
      <span class="quality-badge">{{ viewerStore.renderQuality }}</span>
      <span>按 ESC 退出当前模式</span>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useViewerStore } from '@/stores/viewerStore'

const viewerStore = useViewerStore()

function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}
</script>

<style scoped>
.status-bar {
  height: var(--status-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: rgba(5, 8, 15, 0.98);
  border-top: 1px solid var(--bg-panel-border);
  font-size: 12px;
  color: var(--text-secondary);
  z-index: 100;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: var(--success);
  box-shadow: 0 0 6px var(--success);
}

.status-dot.offline {
  background: var(--text-muted);
}

.model-info {
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.status-center {
  color: var(--accent-cyan);
}

.quality-badge {
  padding: 2px 8px;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: var(--radius-sm);
  color: var(--accent-cyan);
}
</style>
