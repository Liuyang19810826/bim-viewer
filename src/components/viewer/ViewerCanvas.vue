<template>
  <div ref="containerRef" class="viewer-canvas" @click="picking.onCanvasClick">
    <LoadingOverlay />
  </div>
</template>

<script setup lang="ts">
import { useBIMViewer } from '@/composables/useBIMViewer'
import { usePicking } from '@/composables/usePicking'
import { useKeyboard } from '@/composables/useKeyboard'
import LoadingOverlay from './LoadingOverlay.vue'

const { containerRef } = useBIMViewer()
const picking = usePicking()
useKeyboard()
</script>

<style scoped>
.viewer-canvas {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 0;
  background: var(--bg-secondary);
  overflow: hidden;
}

.viewer-canvas :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
