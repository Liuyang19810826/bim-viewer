<template>
  <div ref="containerRef" class="axes-icon" title="世界坐标系：红=X，绿=Y，蓝=Z" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { viewer } from '@/composables/useBIMViewer'

const containerRef = ref<HTMLElement | null>(null)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let rafId = 0

onMounted(() => {
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  scene = new THREE.Scene()
  scene.background = null

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(2, 2, 2)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(80, 80)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  containerRef.value.appendChild(renderer.domElement)

  const axesHelper = new THREE.AxesHelper(1.2)
  scene.add(axesHelper)

  // Add axis labels using sprites
  const createLabel = (text: string, color: string, position: THREE.Vector3) => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.font = 'bold 40px sans-serif'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 32, 32)
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.position.copy(position)
    sprite.scale.set(0.5, 0.5, 0.5)
    return sprite
  }

  scene.add(createLabel('X', '#ff4444', new THREE.Vector3(1.4, 0, 0)))
  scene.add(createLabel('Y', '#44ff44', new THREE.Vector3(0, 1.4, 0)))
  scene.add(createLabel('Z', '#4444ff', new THREE.Vector3(0, 0, 1.4)))

  const animate = () => {
    if (!renderer || !scene || !camera || !containerRef.value) return
    rafId = requestAnimationFrame(animate)

    if (viewer.value) {
      const dir = viewer.value.getCameraDirection()
      camera.position.copy(dir.clone().multiplyScalar(3))
      camera.lookAt(0, 0, 0)
    }

    renderer.render(scene, camera)
  }
  animate()
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  renderer?.dispose()
  if (renderer?.domElement.parentNode && containerRef.value) {
    containerRef.value.removeChild(renderer.domElement)
  }
})
</script>

<style scoped>
.axes-icon {
  position: absolute;
  left: calc(var(--panel-width) + 32px);
  bottom: calc(var(--status-height) + 16px);
  width: 80px;
  height: 80px;
  background: rgba(5, 8, 15, 0.6);
  border: 1px solid var(--bg-panel-border);
  border-radius: var(--radius-md);
  backdrop-filter: blur(4px);
  z-index: 50;
  overflow: hidden;
}

.axes-icon :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
