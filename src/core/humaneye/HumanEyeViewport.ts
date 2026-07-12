import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PresetApplier } from '../rendering/PresetApplier'
import { useSettingsStore } from '@/stores/settingsStore'
import type { BIMViewer } from '../BIMViewer'
import type { RenderPreset } from '@/types'

export class HumanEyeViewport {
  container: HTMLElement
  viewer: BIMViewer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  private rafId = 0
  private resizeObserver: ResizeObserver | null = null
  private basePoint: THREE.Vector3 | null = null
  private modelClone: THREE.Group | null = null
  private presetApplier = new PresetApplier()
  private currentPreset: RenderPreset = 'solid'

  constructor(container: HTMLElement, viewer: BIMViewer) {
    this.container = container
    this.viewer = viewer

    const rect = container.getBoundingClientRect()

    this.scene = new THREE.Scene()
    const bg = viewer.scene.background
    this.scene.background = bg instanceof THREE.Color ? bg.clone() : null
    this.scene.environment = viewer.scene.environment

    this.camera = new THREE.PerspectiveCamera(60, rect.width / rect.height || 1, 0.1, 2000)
    this.camera.position.set(0, 1.6, 0)
    this.camera.lookAt(0, 1.6, 1)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: this.scene.background === null,
      powerPreference: 'high-performance',
    })
    this.renderer.setSize(Math.max(rect.width, 1), Math.max(rect.height, 1))
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    }
    this.controls.target.set(0, 1.6, 1)
    this.controls.update()

    this.setupLights()
    this.bindResize()
    this.startRenderLoop()
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)
    const directional = new THREE.DirectionalLight(0xffffff, 0.8)
    directional.position.set(5, 10, 7)
    this.scene.add(directional)
  }

  setTarget(point: THREE.Vector3, eyeHeight = 1.6): void {
    this.basePoint = point.clone()
    this.ensureModelClone()
    const position = new THREE.Vector3(point.x, point.y + eyeHeight, point.z)

    const dir = new THREE.Vector3()
      .subVectors(this.viewer.orbit.controls.target, point)
      .setY(0)
      .normalize()
    if (dir.lengthSq() < 0.0001) {
      dir.set(0, 0, 1)
    }
    const lookAt = position.clone().add(dir)
    this.camera.position.copy(position)
    this.camera.lookAt(lookAt)
    this.controls.target.copy(lookAt)
    this.controls.update()
  }

  setEyeHeight(height: number): void {
    if (this.basePoint) {
      this.setTarget(this.basePoint, height)
    }
  }

  setPreset(preset: RenderPreset): void {
    this.currentPreset = preset
    if (!this.modelClone) return
    const settings = useSettingsStore().render
    this.presetApplier.reset(this.modelClone)
    this.presetApplier.apply(this.modelClone, preset, settings)
  }

  private ensureModelClone(): void {
    const current = this.viewer.getCurrentModel()
    if (!current || this.modelClone) return

    this.modelClone = this.deepCloneModel(current)
    this.scene.add(this.modelClone)
    this.setPreset(this.currentPreset)
  }

  private deepCloneModel(root: THREE.Group): THREE.Group {
    const clone = root.clone(true)
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone())
      } else if (mesh.material) {
        mesh.material = mesh.material.clone()
      }
    })
    return clone
  }

  private bindResize(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        const { width, height } = entry.contentRect
        this.setSize(width, height)
      })
      this.resizeObserver.observe(this.container)
    } else {
      window.addEventListener('resize', this.onWindowResize)
    }
  }

  private onWindowResize = (): void => {
    const rect = this.container.getBoundingClientRect()
    this.setSize(rect.width, rect.height)
  }

  private setSize(width: number, height: number): void {
    const w = Math.max(width, 1)
    const h = Math.max(height, 1)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  private startRenderLoop(): void {
    const animate = () => {
      if (!this.container.isConnected) return
      this.rafId = requestAnimationFrame(animate)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId)
    this.resizeObserver?.disconnect()
    window.removeEventListener('resize', this.onWindowResize)
    this.controls.dispose()
    this.presetApplier.reset(this.modelClone || this.scene)
    this.disposeCloneMaterials(this.modelClone)
    this.renderer.dispose()
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }

  private disposeCloneMaterials(node: THREE.Object3D | null): void {
    if (!node) return
    node.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((m) => m?.dispose())
    })
  }
}
