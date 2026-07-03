import * as THREE from 'three'
import { useLogStore } from '@/stores/logStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { findUserData } from '@/utils/threeData'
import { useViewerStore } from '@/stores/viewerStore'
import { FolderGLTFLoader } from './loaders/FolderGLTFLoader'
import { OrbitControl } from './controls/OrbitControl'
import { RoamingControl } from './controls/RoamingControl'
import { ClipManager } from './clipping/ClipManager'
import { ComponentPicker } from './picking/ComponentPicker'
import { MaterialReplacer } from './rendering/MaterialReplacer'
import { EnvironmentBuilder } from './rendering/EnvironmentBuilder'
import { PostProcessing } from './rendering/PostProcessing'
import { PresetApplier } from './rendering/PresetApplier'
import type { AppSettings, ComponentData, ModelInfo, ViewerMode, RoamingSpeed, ClipAxis, APIResponse, ComponentTreeItem, RenderPreset } from '@/types'

export interface BIMViewerOptions {
  container: HTMLElement
}

export type CameraType = 'perspective' | 'orthographic'

export class BIMViewer {
  container: HTMLElement
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera
  cameraType: CameraType = 'perspective'
  renderer: THREE.WebGLRenderer
  orbit: OrbitControl
  roaming: RoamingControl
  clipManager: ClipManager
  picker: ComponentPicker
  loader = new FolderGLTFLoader()
  postProcessing?: PostProcessing
  presetApplier = new PresetApplier()

  private currentModel: THREE.Group | null = null
  private defaultCameraPosition = new THREE.Vector3(30, 30, 30)
  private defaultTarget = new THREE.Vector3(0, 0, 0)
  private animationId = 0
  private clock = new THREE.Clock()
  private usePostProcessing = true
  private disposed = false
  private viewLocked = false

  constructor(options: BIMViewerOptions) {
    this.container = options.container

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#0a0f1a')

    const rect = this.container.getBoundingClientRect()
    this.camera = this.createPerspectiveCamera(rect)

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
    this.renderer.setSize(rect.width, rect.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.localClippingEnabled = true
    this.container.appendChild(this.renderer.domElement)

    this.orbit = new OrbitControl(this.camera, this.renderer.domElement)
    this.orbit.controls.target.copy(this.defaultTarget)
    this.orbit.saveState()

    this.roaming = new RoamingControl(this.camera, this.renderer.domElement)
    this.clipManager = new ClipManager(this.scene, this.renderer)

    const settings = useSettingsStore()
    this.picker = new ComponentPicker(this.camera, this.scene, settings.general.highlightColor)

    this.setupLights()
    this.applySettings(settings.settings)
    this.startRenderLoop()

    window.addEventListener('resize', this.onResize)
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.3)
    this.scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 0.8)
    directional.position.set(50, 80, 50)
    directional.castShadow = true
    directional.shadow.mapSize.set(2048, 2048)
    directional.shadow.camera.near = 0.5
    directional.shadow.camera.far = 200
    directional.shadow.camera.left = -50
    directional.shadow.camera.right = 50
    directional.shadow.camera.top = 50
    directional.shadow.camera.bottom = -50
    this.scene.add(directional)
  }

  private startRenderLoop(): void {
    const animate = () => {
      if (this.disposed) return
      this.animationId = requestAnimationFrame(animate)

      const delta = this.clock.getDelta()
      this.roaming.update(delta)
      this.orbit.update()

      if (this.usePostProcessing && this.postProcessing) {
        this.postProcessing.render()
      } else {
        this.renderer.render(this.scene, this.camera)
      }
    }
    animate()
  }

  private onResize = (): void => {
    const rect = this.container.getBoundingClientRect()
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = rect.width / rect.height
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      const size = (this.camera.top - this.camera.bottom) / 2
      const aspect = rect.width / rect.height
      this.camera.left = -size * aspect
      this.camera.right = size * aspect
      this.camera.top = size
      this.camera.bottom = -size
    }
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(rect.width, rect.height)
    this.postProcessing?.setSize(rect.width, rect.height)
  }

  async loadModel(files: File[]): Promise<APIResponse<ModelInfo | null>> {
    const viewer = useViewerStore()
    const logs = useLogStore()

    try {
      viewer.setLoading(true)
      viewer.setLoadProgress({ loaded: 0, total: 1, percentage: 0 })

      const result = await this.loader.load(files, (progress) => {
        viewer.setLoadProgress(progress)
      })

      this.clearModel(false)
      this.currentModel = result.scene
      this.scene.add(result.scene)

      MaterialReplacer.replaceWithStandardMaterial(result.scene, useSettingsStore().render)
      this.applyCurrentPreset()
      this.fitCameraToModel()

      const envTexture = EnvironmentBuilder.buildDefaultEnvironment(this.renderer)
      this.scene.environment = envTexture

      this.initPostProcessing()

      viewer.setModelInfo(result.info)
      viewer.setModelLoaded(true)
      viewer.setStatusMessage(`模型加载成功：${result.info.name}`)
      logs.add('模型加载', 'success', 'user', result.info.name)

      return { code: 200, message: '模型加载成功', data: result.info, timestamp: Date.now() }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '未知错误'
      viewer.setStatusMessage(`模型加载失败：${msg}`)
      logs.add('模型加载', 'fail', 'user', msg)
      return { code: 500, message: msg, data: null, timestamp: Date.now() }
    } finally {
      viewer.setLoading(false)
    }
  }

  private fitCameraToModel(): void {
    if (!this.currentModel) return
    const box = new THREE.Box3().setFromObject(this.currentModel)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const distance = maxDim * 1.5

    this.defaultTarget.copy(center)
    this.defaultCameraPosition.set(center.x + distance, center.y + distance, center.z + distance)

    this.camera.position.copy(this.defaultCameraPosition)
    this.camera.lookAt(center)
    this.orbit.controls.target.copy(center)
    this.orbit.saveState()
  }

  private initPostProcessing(): void {
    if (this.postProcessing) {
      this.postProcessing.dispose()
      this.postProcessing = undefined
    }
    const rect = this.container.getBoundingClientRect()
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera, rect.width, rect.height, useSettingsStore().render)
  }

  private createPerspectiveCamera(rect: DOMRect): THREE.PerspectiveCamera {
    const cam = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 2000)
    cam.position.copy(this.defaultCameraPosition)
    cam.lookAt(this.defaultTarget)
    return cam
  }

  private createOrthographicCamera(rect: DOMRect): THREE.OrthographicCamera {
    const distance = this.camera ? this.camera.position.distanceTo(this.orbit?.controls.target || this.defaultTarget) : 50
    const aspect = rect.width / rect.height
    const size = distance * 0.8
    const cam = new THREE.OrthographicCamera(-size * aspect, size * aspect, size, -size, 0.1, 2000)
    cam.position.copy(this.defaultCameraPosition)
    cam.lookAt(this.defaultTarget)
    return cam
  }

  private recreateCameraControls(): void {
    const target = this.orbit.controls.target.clone()
    const position = this.camera.position.clone()
    const rect = this.container.getBoundingClientRect()

    this.orbit.dispose()
    this.roaming.dispose()

    if (this.cameraType === 'orthographic') {
      this.camera = this.createOrthographicCamera(rect)
    } else {
      this.camera = this.createPerspectiveCamera(rect)
    }
    this.camera.position.copy(position)
    this.camera.lookAt(target)

    this.orbit = new OrbitControl(this.camera, this.renderer.domElement)
    this.orbit.controls.target.copy(target)
    this.orbit.saveState()

    this.roaming = new RoamingControl(this.camera, this.renderer.domElement)

    this.picker = new ComponentPicker(this.camera, this.scene, useSettingsStore().general.highlightColor)

    this.initPostProcessing()
    this.applySettings(useSettingsStore().settings)
  }

  switchCameraType(): void {
    this.cameraType = this.cameraType === 'perspective' ? 'orthographic' : 'perspective'
    this.recreateCameraControls()
    useLogStore().add(`切换为${this.cameraType === 'perspective' ? '透视' : '正交'}投影`, 'success', 'user')
  }

  setCameraType(type: CameraType): void {
    if (this.cameraType === type) return
    this.cameraType = type
    this.recreateCameraControls()
  }

  getCameraDirection(): THREE.Vector3 {
    const target = this.orbit.controls.target
    return new THREE.Vector3().subVectors(this.camera.position, target).normalize()
  }

  getCameraTarget(): THREE.Vector3 {
    return this.orbit.controls.target.clone()
  }

  getCameraDistance(): number {
    return this.camera.position.distanceTo(this.orbit.controls.target)
  }

  setViewDirection(direction: THREE.Vector3): void {
    if (this.viewLocked) return
    const target = this.orbit.controls.target.clone()
    const distance = this.getCameraDistance()
    const newDir = direction.clone().normalize()
    this.camera.position.copy(target).add(newDir.multiplyScalar(Math.max(distance, 10)))
    this.camera.lookAt(target)
    this.orbit.controls.update()
    useLogStore().add('切换标准视角', 'success', 'user')
  }

  rotateView(deltaAzimuth: number, deltaPolar: number): void {
    if (this.viewLocked) return
    const target = this.orbit.controls.target
    const offset = new THREE.Vector3().subVectors(this.camera.position, target)
    const spherical = new THREE.Spherical().setFromVector3(offset)
    spherical.theta -= deltaAzimuth
    spherical.phi += deltaPolar
    spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, spherical.phi))
    offset.setFromSpherical(spherical)
    this.camera.position.copy(target).add(offset)
    this.camera.lookAt(target)
    this.orbit.controls.update()
  }

  homeView(): void {
    if (this.viewLocked) return
    this.camera.position.copy(this.defaultCameraPosition)
    this.camera.lookAt(this.defaultTarget)
    this.orbit.controls.target.copy(this.defaultTarget)
    this.orbit.saveState()
    useLogStore().add('回到主视图', 'success', 'user')
  }

  setViewLocked(locked: boolean): void {
    this.viewLocked = locked
    this.orbit.setEnabled(!locked)
    useLogStore().add(locked ? '锁定视图方向' : '解锁视图方向', 'success', 'user')
  }

  isViewLocked(): boolean {
    return this.viewLocked
  }

  clearModel(logAction = true): void {
    if (this.currentModel) {
      this.currentModel.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry.dispose()
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m) => m.dispose())
        }
      })
      this.scene.remove(this.currentModel)
      this.currentModel = null
    }

    this.picker.clearHighlight()
    useViewerStore().selectComponent(null)
    useViewerStore().setModelLoaded(false)
    useViewerStore().setModelInfo(null)
    if (logAction) {
      useLogStore().add('模型清空', 'success', 'user')
      useViewerStore().setStatusMessage('模型已清空')
    }
  }

  resetView(): void {
    this.orbit.reset()
    useViewerStore().setStatusMessage('视角已重置')
    useLogStore().add('视角重置', 'success', 'user')
  }

  resetScene(): void {
    this.disableClipping()
    this.exitRoaming()
    this.resetView()
    this.picker.clearHighlight()
    useViewerStore().selectComponent(null)
    useViewerStore().setStatusMessage('场景已重置')
    useLogStore().add('场景重置', 'success', 'user')
  }

  setMode(mode: ViewerMode): void {
    const viewer = useViewerStore()
    if (viewer.mode === mode) return

    if (mode === 'roam') {
      this.enterRoaming()
    } else {
      this.exitRoaming()
    }

    if (mode === 'clip') {
      this.clipManager.enable()
      this.orbit.controls.enableRotate = false
    } else {
      this.disableClipping()
      this.orbit.controls.enableRotate = true
    }

    viewer.setMode(mode)
    viewer.setStatusMessage(`切换到${mode === 'view' ? '普通查看' : mode === 'clip' ? '剖切模式' : '漫游模式'}`)
  }

  toggleClipping(): void {
    const viewer = useViewerStore()
    if (viewer.isClipping) {
      this.setMode('view')
    } else {
      this.setMode('clip')
    }
  }

  setClipAxis(axis: ClipAxis): void {
    this.clipManager.setAxis(axis)
    useLogStore().add(`剖切轴切换为 ${axis.toUpperCase()}`, 'success', 'user')
  }

  setClipOffset(value: number): void {
    this.clipManager.setOffset(value)
  }

  disableClipping(): void {
    this.clipManager.disable()
  }

  enterRoaming(): void {
    this.orbit.setEnabled(false)
    this.roaming.start()
    useLogStore().add('开启漫游', 'success', 'user')
  }

  exitRoaming(): void {
    this.roaming.stop()
    this.orbit.setEnabled(true)
  }

  toggleRoaming(): void {
    const viewer = useViewerStore()
    if (viewer.isRoaming) {
      this.setMode('view')
    } else {
      this.setMode('roam')
    }
  }

  setRoamingSpeed(speed: RoamingSpeed): void {
    this.roaming.setSpeed(speed)
    useSettingsStore().updateGeneral({ roamingSpeed: speed })
  }

  pickComponent(clientX: number, clientY: number): ComponentData | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const data = this.picker.pick(clientX - rect.left, clientY - rect.top, rect.width, rect.height)
    if (data) {
      useViewerStore().selectComponent(data)
      useLogStore().add('属性查询', 'success', 'user', data.name)
    }
    return data
  }

  clearSelection(): void {
    this.picker.clearHighlight()
    useViewerStore().selectComponent(null)
  }

  selectComponentById(id: string): ComponentData | null {
    if (!this.currentModel) return null
    let found: THREE.Object3D | null = null
    this.currentModel.traverse((obj) => {
      if (obj.uuid === id || obj.userData?.id === id) {
        found = obj
      }
    })
    if (found && (found as THREE.Mesh).isMesh) {
      this.picker.highlight(found as THREE.Mesh)
      const data = this.picker.extractComponentData(found)
      useViewerStore().selectComponent(data)
      return data
    }
    return null
  }

  applySettings(settings: AppSettings): void {
    this.scene.background = new THREE.Color(settings.general.backgroundColor)
    this.picker.setHighlightColor(settings.general.highlightColor)
    this.orbit.controls.zoomSpeed = settings.general.zoomSpeed
    this.orbit.controls.rotateSpeed = settings.general.panSensitivity
    this.orbit.controls.panSpeed = settings.general.panSensitivity
    this.roaming.setSpeed(settings.general.roamingSpeed)

    this.renderer.toneMapping = settings.render.acesToneMapping ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping
    this.renderer.toneMappingExposure = settings.render.acesIntensity
    this.renderer.outputColorSpace = settings.render.srgbOutput ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace
    this.renderer.shadowMap.enabled = settings.render.shadowEnabled

    if (this.currentModel) {
      MaterialReplacer.updateMaterials(this.currentModel, settings.render)
      this.applyCurrentPreset()
    }

    this.postProcessing?.applySettings(settings.render)
  }

  private applyCurrentPreset(): void {
    if (!this.currentModel) return
    const settings = useSettingsStore().render
    this.presetApplier.apply(this.currentModel, settings.preset, settings)
  }

  setRenderPreset(preset: RenderPreset): void {
    useSettingsStore().updateRender({ preset })
    this.applyCurrentPreset()
    useLogStore().add(`切换渲染预设：${this.getPresetLabel(preset)}`, 'success', 'user')
  }

  private getPresetLabel(preset: RenderPreset): string {
    const labels: Record<RenderPreset, string> = {
      solid: '实体着色模式',
      discipline: '专业分层单色模式',
      system: '系统分区着色模式',
      'wireframe-solid': '线框叠加实体模式',
      'hidden-wireframe': '消隐线框模式',
      transparency: '透明度分级模式',
      'highlight-type': '图元类型高亮模式',
      'section-cut': '截面剖切着色模式',
    }
    return labels[preset]
  }

  getComponentTree(): ComponentTreeItem[] {
    if (!this.currentModel) return []
    const items: ComponentTreeItem[] = []
    this.currentModel.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const userData = findUserData(mesh)
      items.push({
        id: mesh.uuid,
        name: (userData.name as string) || mesh.name || '未命名构件',
        type: (userData.type as string) || '未知类型',
        discipline: (userData.discipline as string) || '其他',
        system: (userData.system as string) || (userData.type as string) || '其他',
        visible: mesh.visible,
        opacity: this.getMeshOpacity(mesh),
        object: mesh,
        children: [],
      })
    })
    return items
  }

  private getMeshOpacity(mesh: THREE.Mesh): number {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      if ((mat as THREE.Material).opacity !== undefined) {
        return (mat as THREE.Material).opacity
      }
    }
    return 1
  }

  setComponentsVisibility(ids: string[], visible: boolean): void {
    if (!this.currentModel) return
    this.currentModel.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      if (ids.includes(mesh.uuid)) {
        mesh.visible = visible
      }
    })
  }

  setComponentsOpacity(ids: string[], opacity: number): void {
    if (!this.currentModel) return
    this.currentModel.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      if (ids.includes(mesh.uuid)) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.transparent = opacity < 1
            mat.opacity = opacity
            mat.needsUpdate = true
          }
        })
      }
    })
  }

  highlightComponents(ids: string[]): void {
    if (!this.currentModel) return
    this.currentModel.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      if (ids.includes(mesh.uuid)) {
        // Optional: add highlight effect
      }
    })
  }

  getComponentVisibility(id: string): boolean {
    if (!this.currentModel) return true
    let visible = true
    this.currentModel.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.uuid !== id) return
      visible = mesh.visible
    })
    return visible
  }

  getComponentOpacity(id: string): number {
    if (!this.currentModel) return 1
    let opacity = 1
    this.currentModel.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.uuid !== id) return
      opacity = this.getMeshOpacity(mesh)
    })
    return opacity
  }

  setComponentVisibility(id: string, visible: boolean): void {
    this.setComponentsVisibility([id], visible)
  }

  setComponentOpacity(id: string, opacity: number): void {
    this.setComponentsOpacity([id], opacity)
  }

  setComponentColor(id: string, color: string): void {
    if (!this.currentModel) return
    const colorObj = new THREE.Color(color)
    this.currentModel.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.uuid !== id) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.color.set(colorObj)
          mat.needsUpdate = true
        }
      })
      this.applyToPickerOriginal(mesh, (mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.color.set(colorObj)
          mat.needsUpdate = true
        }
      })
    })
  }

  setComponentsColor(ids: string[], color: string): void {
    ids.forEach((id) => this.setComponentColor(id, color))
  }

  private applyToPickerOriginal(mesh: THREE.Mesh, callback: (mat: THREE.Material) => void): void {
    const highlighted = (this.picker as unknown as { highlightedObject: THREE.Object3D | null }).highlightedObject
    const original = (this.picker as unknown as { originalMaterial: THREE.Material | THREE.Material[] | null }).originalMaterial
    if (highlighted && highlighted.uuid === mesh.uuid && original) {
      const mats = Array.isArray(original) ? original : [original]
      mats.forEach(callback)
    }
  }

  setPostProcessingEnabled(enabled: boolean): void {
    this.usePostProcessing = enabled
  }

  getSceneStatus() {
    const viewer = useViewerStore()
    return {
      mode: viewer.mode,
      modelLoaded: viewer.modelLoaded,
      selectedComponentId: viewer.selectedComponent?.id || null,
      renderQuality: viewer.renderQuality,
    }
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.animationId)
    window.removeEventListener('resize', this.onResize)
    this.clearModel(false)
    this.picker.dispose()
    this.roaming.dispose()
    this.orbit.dispose()
    this.clipManager.dispose()
    this.postProcessing?.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
