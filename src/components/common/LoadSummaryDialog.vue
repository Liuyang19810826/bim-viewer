<template>
  <TechDialog
    v-model="visible"
    title="模型导入成功"
    @confirm="close"
  >
    <div class="summary-content">
      <div class="summary-row">
        <span class="summary-key">模型文件</span>
        <span class="summary-value">{{ summary?.name }}</span>
      </div>
      <div class="summary-row">
        <span class="summary-key">图元数量</span>
        <span class="summary-value">{{ summary?.componentCount }}</span>
      </div>
      <div class="summary-row">
        <span class="summary-key">顶点数量</span>
        <span class="summary-value">{{ summary?.vertexCount }}</span>
      </div>
      <div class="summary-row">
        <span class="summary-key">三角面数量</span>
        <span class="summary-value">{{ summary?.triangleCount }}</span>
      </div>
      <div class="summary-row">
        <span class="summary-key">识别楼层</span>
        <span class="summary-value">{{ floorNames }}</span>
      </div>
      <div v-if="floorDetails.length > 0" class="floor-list">
        <div
          v-for="floor in floorDetails"
          :key="floor.key"
          class="floor-item"
        >
          <span class="floor-name">{{ floor.name }}</span>
          <span class="floor-count">{{ floor.ids.length }} 个图元</span>
        </div>
      </div>
    </div>
    <template #footer>
      <TechButton active @click="close">确定</TechButton>
    </template>
  </TechDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import TechDialog from './TechDialog.vue'
import TechButton from './TechButton.vue'

const viewerStore = useViewerStore()
const summary = computed(() => viewerStore.loadSummary)
const visible = computed({
  get: () => !!summary.value,
  set: (v) => {
    if (!v) viewerStore.setLoadSummary(null)
  },
})

const floorNames = computed(() => {
  const floors = summary.value?.floors || []
  return floors.length > 0 ? floors.map((f) => f.name).join('、') : '无'
})

const floorDetails = computed(() => summary.value?.floors || [])

function close() {
  viewerStore.setLoadSummary(null)
}

</script>

<style scoped>
.summary-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.summary-key {
  color: var(--text-secondary);
}

.summary-value {
  color: var(--text-primary);
  font-weight: 500;
}

.floor-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
}

.floor-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.floor-name {
  color: var(--accent-cyan);
}

.floor-count {
  color: var(--text-muted);
}
</style>
