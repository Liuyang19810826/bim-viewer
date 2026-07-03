<template>
  <div class="view-cube-wrapper">
    <div ref="containerRef" class="view-cube-canvas" />
    <div class="view-cube-toolbar">
      <TechButton :active="isLocked" @click="toggleLock">
        {{ isLocked ? '解锁' : '锁定' }}
      </TechButton>
      <TechButton @click="homeView">主视图</TechButton>
      <TechButton @click="switchCamera">
        {{ cameraType === 'orthographic' ? '透视' : '正交' }}
      </TechButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as THREE from 'three'
import { ViewCubeManager } from '@/core/viewcube/ViewCubeManager'
import { viewer } from '@/composables/useBIMViewer'
import TechButton from '@/components/common/TechButton.vue'

const containerRef = ref<HTMLElement | null>(null)
let viewCube: ViewCubeManager | null = null

const isLocked = computed(() => viewer.value?.isViewLocked() ?? false)
const cameraType = computed(() => viewer.value?.cameraType ?? 'perspective')

onMounted(() => {
  if (!containerRef.value || !viewer.value) return

  viewCube = new ViewCubeManager(containerRef.value, viewer.value)

  viewCube.setCallbacks(
    (event) => {
      const v = viewer.value
      if (!v) return
      const dir = event.direction
      if (event.type === 'face') {
        v.setViewDirection(dir)
      } else if (event.type === 'edge') {
        v.setViewDirection(dir)
      } else if (event.type === 'vertex') {
        v.setViewDirection(dir)
      }
    },
    (deltaX, deltaY) => {
      viewer.value?.rotateView(deltaX, deltaY)
    }
  )

  startSync()
})

onUnmounted(() => {
  viewCube?.dispose()
  viewCube = null
})

let syncRaf = 0
function startSync() {
  const sync = () => {
    if (!viewCube || !viewer.value) return
    const dir = viewer.value.getCameraDirection()
    viewCube.syncOrientation(dir)
    syncRaf = requestAnimationFrame(sync)
  }
  sync()
}

function homeView() {
  viewer.value?.homeView()
}

function switchCamera() {
  viewer.value?.switchCameraType()
}

function toggleLock() {
  const v = viewer.value
  if (!v) return
  v.setViewLocked(!v.isViewLocked())
}
</script>

<style scoped>
.view-cube-wrapper {
  position: absolute;
  right: 16px;
  top: calc(var(--header-height) + 16px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 50;
}

.view-cube-canvas {
  width: 120px;
  height: 120px;
  background: rgba(5, 8, 15, 0.6);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-md);
  backdrop-filter: blur(4px);
  cursor: grab;
  overflow: hidden;
}

.view-cube-canvas:active {
  cursor: grabbing;
}

.view-cube-canvas :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

.view-cube-toolbar {
  display: flex;
  flex-direction: row;
  gap: 6px;
  justify-content: center;
}

.view-cube-toolbar .tech-button {
  padding: 5px 10px;
  font-size: 12px;
}
</style>
