<template>
  <div v-if="clip.isClipping" ref="panelRef" class="clip-control-panel" :style="dragStyle">
    <TechPanel title="剖切控制">
      <div class="clip-section">
        <label>剖切方向</label>
        <div class="clip-axis-group">
          <TechButton
            v-for="a in axes"
            :key="a"
            :active="clip.axis === a"
            @click="clip.setAxis(a)"
          >
            {{ a.toUpperCase() }}
          </TechButton>
        </div>
      </div>
      <TechSlider
        :model-value="clip.offset"
        label="剖切位置"
        :min="clip.minOffset"
        :max="clip.maxOffset"
        :step="0.1"
        :display-value="clip.offset.toFixed(1)"
        @update:model-value="clip.setOffset"
      />
      <div class="clip-actions">
        <TechButton @click="clip.resetClip">重置位置</TechButton>
        <TechButton @click="closeClipping">关闭剖切</TechButton>
      </div>
    </TechPanel>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useClipping } from '@/composables/useClipping'
import { viewer } from '@/composables/useBIMViewer'
import { useDraggable } from '@/composables/useDraggable'
import TechPanel from '@/components/common/TechPanel.vue'
import TechButton from '@/components/common/TechButton.vue'
import TechSlider from '@/components/common/TechSlider.vue'
import type { ClipAxis } from '@/types'

const clip = useClipping()
const axes: ClipAxis[] = ['x', 'y', 'z']
const panelRef = ref<HTMLElement | null>(null)
const { style: dragStyle } = useDraggable(panelRef, '.tech-panel-header')

function closeClipping() {
  viewer.value?.setMode('view')
}
</script>

<style scoped>
.clip-control-panel {
  position: absolute;
  left: 50%;
  bottom: calc(var(--status-height) + 16px);
  transform: translateX(-50%);
  width: 360px;
  z-index: 60;
}

.clip-section {
  margin-bottom: 12px;
}

.clip-section label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.clip-axis-group {
  display: flex;
  gap: 8px;
}

.clip-axis-group .tech-button {
  flex: 1;
}

.clip-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.clip-actions .tech-button {
  flex: 1;
}
</style>
