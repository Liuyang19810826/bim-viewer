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
import { PerformanceMonitor } from './PerformanceMonitor'
import { RegionZoomManager } from './region/RegionZoomManager'
import type { AppSettings, ComponentData, ModelInfo, ViewerMode, RoamingSpeed, ClipAxis, APIResponse, ComponentTreeItem, RenderPreset, FloorInfo, SceneTreeNode, ModelStats, NodeProperties, MaterialInfo, RenderSettings, PerformanceStats, MeasurementType, MeasurementPoint } from '@/types'

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
  performanceMonitor: PerformanceMonitor

  private currentModel: THREE.Group | null = null
  private gridHelper: THREE.GridHelper | null = null
  private zeroGridHelper: THREE.GridHelper | null = null
  private selectedNode: THREE.Object3D | null = null
  private selectedNodeOriginalEmissive = new Map<string, { color: THREE.Color; intensity: number }>()
  private ambientLight: THREE.AmbientLight | null = null
  private directionalLight: THREE.DirectionalLight | null = null
  private materialOriginalValues = new Map<string, Partial<Record<keyof import('@/types').MaterialInfo, unknown>>>()
  private measurementGroup = new THREE.Group()
  private measurementRaycaster = new THREE.Raycaster()
  private regionZoomManager: RegionZoomManager | null = null
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
    this.performanceMonitor = new PerformanceMonitor(this.renderer)
    this.measurementGroup.name = 'MeasurementGroup'
    this.scene.add(this.measurementGroup)

    const settings = useSettingsStore()
    this.picker = new ComponentPicker(this.camera, this.scene, settings.general.highlightColor)

    this.setupLights()
    this.applySettings(settings.settings)
    this.startRenderLoop()

    window.addEventListener('resize', this.onResize)
  }

  private setupLights(): void {
    const settings = useSettingsStore().render

    this.ambientLight = new THREE.AmbientLight(settings.ambientColor, settings.ambientIntensity)
    this.scene.add(this.ambientLight)

    this.directionalLight = new THREE.DirectionalLight(settings.directionalColor, settings.directionalIntensity)
    this.directionalLight.position.set(
      settings.directionalPosition.x,
      settings.directionalPosition.y,
      settings.directionalPosition.z
    )
    this.directionalLight.target.position.set(
      settings.directionalTarget.x,
      settings.directionalTarget.y,
      settings.directionalTarget.z
    )
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.set(settings.shadowResolution, settings.shadowResolution)
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 200
    this.directionalLight.shadow.camera.left = -settings.shadowRange
    this.directionalLight.shadow.camera.right = settings.shadowRange
    this.directionalLight.shadow.camera.top = settings.shadowRange
    this.directionalLight.shadow.camera.bottom = -settings.shadowRange
    this.scene.add(this.directionalLight)
    this.scene.add(this.directionalLight.target)
  }

  private startRenderLoop(): void {
    const animate = () => {
      if (this.disposed) return
      this.animationId = requestAnimationFrame(animate)

      const delta = this.clock.getDelta()
      this.roaming.update(delta)
      this.orbit.update()

      this.performanceMonitor.beginFrame()
      if (this.usePostProcessing && this.postProcessing) {
        this.postProcessing.render()
      } else {
        this.renderer.render(this.scene, this.camera)
      }
      this.performanceMonitor.endFrame()
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
      this.updateGrid()

      const envTexture = EnvironmentBuilder.buildDefaultEnvironment(this.renderer)
      this.scene.environment = envTexture

      this.initPostProcessing()

      viewer.setModelInfo(result.info)
      viewer.setModelStats(this.getModelStats())
      viewer.setGltfValidation(result.validation || null)
      viewer.setModelLoaded(true)
      viewer.setFloors(this.getFloors())
      viewer.setLoadSummary({
        name: result.info.name,
        componentCount: result.info.componentCount,
        vertexCount: result.info.vertexCount,
        triangleCount: result.info.triangleCount,
        floors: this.getFloors(),
      })
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

  private disposeGridHelper(grid: THREE.GridHelper | null): void {
    if (!grid) return
    this.scene.remove(grid)
    ;(grid.geometry as THREE.BufferGeometry).dispose()
    const mats = Array.isArray(grid.material) ? grid.material : [grid.material]
    mats.forEach((m) => (m as THREE.Material).dispose())
  }

  private updateGrid(): void {
    if (!this.currentModel) return
    this.disposeGridHelper(this.gridHelper)
    this.disposeGridHelper(this.zeroGridHelper)
    this.gridHelper = null
    this.zeroGridHelper = null

    const box = new THREE.Box3().setFromObject(this.currentModel)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const gridSize = Math.max(maxDim * 2, 10)
    const divisions = Math.max(Math.round(gridSize / Math.max(maxDim / 10, 1)), 10)

    // Bottom grid aligned with the model bounding box minimum.
    this.gridHelper = new THREE.GridHelper(gridSize, divisions, 0x475569, 0x1e293b)
    this.gridHelper.position.set(center.x, box.min.y, center.z)
    this.scene.add(this.gridHelper)

    // Zero-elevation reference grid to visually separate above/below ground.
    this.zeroGridHelper = new THREE.GridHelper(gridSize, divisions, 0x888888, 0x444444)
    this.zeroGridHelper.position.set(center.x, 0, center.z)
    this.scene.add(this.zeroGridHelper)
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

  getCurrentModel(): THREE.Group | null {
    return this.currentModel
  }

  focusOnBox(box: THREE.Box3): void {
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 0.01)
    const fov = (this.camera as THREE.PerspectiveCamera).fov ?? 60
    const distance = Math.max(
      maxDim / (2 * Math.tan((fov * Math.PI) / 360)) * 1.5,
      maxDim * 0.8
    )
    const offset = this.getCameraDirection().normalize().multiplyScalar(distance)
    this.camera.position.copy(center).add(offset)
    this.camera.lookAt(center)
    this.orbit.controls.target.copy(center)
    this.orbit.controls.update()
    useLogStore().add('区域放大', 'success', 'user')
  }

  startRegionZoom(): void {
    this.stopRegionZoom()
    this.regionZoomManager = new RegionZoomManager(this)
  }

  stopRegionZoom(): void {
    this.regionZoomManager?.dispose()
    this.regionZoomManager = null
  }

  clearModel(logAction = true): void {
    this.stopRegionZoom()
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
    this.disposeGridHelper(this.gridHelper)
    this.disposeGridHelper(this.zeroGridHelper)
    this.gridHelper = null
    this.zeroGridHelper = null

    this.picker.clearHighlight()
    this.deselectNode()
    useViewerStore().selectComponent(null)
    useViewerStore().selectNode(null)
    useViewerStore().setModelLoaded(false)
    useViewerStore().setModelInfo(null)
    useViewerStore().setModelStats(null)
    useViewerStore().setGltfValidation(null)
    useViewerStore().setFloors([])
    useViewerStore().selectFloor(null)
    useViewerStore().setLoadSummary(null)
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
    this.renderer.shadowMap.type = settings.render.shadowSoft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap

    this.applyLightSettings(settings.render)

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

  private applyLightSettings(render: RenderSettings): void {
    if (this.ambientLight) {
      this.ambientLight.color.set(render.ambientColor)
      this.ambientLight.intensity = render.ambientIntensity
    }
    if (this.directionalLight) {
      this.directionalLight.color.set(render.directionalColor)
      this.directionalLight.intensity = render.directionalIntensity
      this.directionalLight.position.set(
        render.directionalPosition.x,
        render.directionalPosition.y,
        render.directionalPosition.z
      )
      this.directionalLight.target.position.set(
        render.directionalTarget.x,
        render.directionalTarget.y,
        render.directionalTarget.z
      )
      this.directionalLight.target.updateMatrixWorld()
      this.directionalLight.shadow.mapSize.set(render.shadowResolution, render.shadowResolution)
      this.directionalLight.shadow.camera.left = -render.shadowRange
      this.directionalLight.shadow.camera.right = render.shadowRange
      this.directionalLight.shadow.camera.top = render.shadowRange
      this.directionalLight.shadow.camera.bottom = -render.shadowRange
    }
  }

  getLightSettings() {
    const pointLights: { uuid: string; name: string; intensity: number; color: string }[] = []
    this.scene.traverse((obj) => {
      const light = obj as THREE.PointLight
      if (light.isPointLight) {
        pointLights.push({
          uuid: light.uuid,
          name: light.name || '点光源',
          intensity: light.intensity,
          color: '#' + light.color.getHexString(),
        })
      }
    })
    const render = useSettingsStore().render
    return {
      ambient: {
        intensity: render.ambientIntensity,
        color: render.ambientColor,
      },
      directional: {
        intensity: render.directionalIntensity,
        color: render.directionalColor,
        position: render.directionalPosition,
        target: render.directionalTarget,
      },
      shadow: {
        enabled: render.shadowEnabled,
        resolution: render.shadowResolution,
        soft: render.shadowSoft,
      },
      pointLights,
    }
  }

  setAmbientLight(intensity: number, color: string): void {
    useSettingsStore().updateRender({ ambientIntensity: intensity, ambientColor: color })
    this.applyLightSettings(useSettingsStore().render)
    useLogStore().add('调整环境光', 'success', 'user')
  }

  setDirectionalLight(
    intensity: number,
    color: string,
    position: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number }
  ): void {
    useSettingsStore().updateRender({
      directionalIntensity: intensity,
      directionalColor: color,
      directionalPosition: position,
      directionalTarget: target,
    })
    this.applyLightSettings(useSettingsStore().render)
    useLogStore().add('调整平行光', 'success', 'user')
  }

  setShadowEnabled(enabled: boolean): void {
    useSettingsStore().updateRender({ shadowEnabled: enabled })
    this.renderer.shadowMap.enabled = enabled
    this.renderer.shadowMap.needsUpdate = true
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => {
          mat.needsUpdate = true
        })
      }
    })
    useLogStore().add(enabled ? '开启阴影' : '关闭阴影', 'success', 'user')
  }

  setShadowResolution(resolution: number): void {
    useSettingsStore().updateRender({ shadowResolution: resolution })
    this.applyLightSettings(useSettingsStore().render)
    useLogStore().add(`阴影分辨率调整为 ${resolution}`, 'success', 'user')
  }

  setShadowSoft(soft: boolean): void {
    useSettingsStore().updateRender({ shadowSoft: soft })
    this.renderer.shadowMap.type = soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap
    useLogStore().add(soft ? '切换为软阴影' : '切换为硬阴影', 'success', 'user')
  }

  setPointLightIntensity(uuid: string, intensity: number): void {
    let found: THREE.PointLight | null = null
    this.scene.traverse((obj) => {
      const light = obj as THREE.PointLight
      if (light.isPointLight && light.uuid === uuid) {
        found = light
      }
    })
    if (found) {
      ;(found as THREE.PointLight).intensity = intensity
      useLogStore().add('调整点光源强度', 'success', 'user')
    }
  }

  getMaterials(): MaterialInfo[] {
    if (!this.currentModel) return []
    const map = new Map<string, THREE.Material>()
    this.currentModel.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat) => {
        if (!map.has(mat.uuid)) map.set(mat.uuid, mat)
      })
    })
    return Array.from(map.values()).map((mat) => this.buildMaterialInfo(mat))
  }

  private buildMaterialInfo(mat: THREE.Material): MaterialInfo {
    if (mat instanceof THREE.MeshStandardMaterial) {
      return {
        uuid: mat.uuid,
        name: mat.name || mat.type || '未命名材质',
        type: 'MeshStandardMaterial',
        color: '#' + mat.color.getHexString(),
        metalness: mat.metalness,
        roughness: mat.roughness,
        normalScale: mat.normalScale?.x ?? 1,
        emissiveIntensity: mat.emissiveIntensity,
        opacity: mat.opacity,
        transparent: mat.transparent,
      }
    }
    return {
      uuid: mat.uuid,
      name: mat.name || mat.type || '未命名材质',
      type: mat.type,
      color: '#ffffff',
      metalness: 0,
      roughness: 1,
      normalScale: 1,
      emissiveIntensity: 0,
      opacity: mat.opacity ?? 1,
      transparent: mat.transparent ?? false,
    }
  }

  getMaterialInfo(uuid: string): MaterialInfo | null {
    const mat = this.findMaterial(uuid)
    if (!mat) return null
    return this.buildMaterialInfo(mat)
  }

  private findMaterial(uuid: string): THREE.Material | null {
    if (!this.currentModel) return null
    let found: THREE.Material | null = null
    this.currentModel.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat) => {
        if (mat.uuid === uuid) found = mat
      })
    })
    return found
  }

  setMaterialValue(uuid: string, key: keyof MaterialInfo, value: unknown): void {
    const mat = this.findMaterial(uuid)
    if (!mat || !(mat instanceof THREE.MeshStandardMaterial)) return
    this.ensureMaterialOriginal(mat)
    switch (key) {
      case 'color':
        mat.color.set(value as string)
        break
      case 'metalness':
        mat.metalness = value as number
        break
      case 'roughness':
        mat.roughness = value as number
        break
      case 'normalScale': {
        const scale = value as number
        mat.normalScale.set(scale, scale)
        break
      }
      case 'emissiveIntensity':
        mat.emissiveIntensity = value as number
        break
      case 'opacity':
        mat.opacity = value as number
        break
      case 'transparent':
        mat.transparent = value as boolean
        break
    }
    mat.needsUpdate = true
  }

  private ensureMaterialOriginal(mat: THREE.MeshStandardMaterial): void {
    if (this.materialOriginalValues.has(mat.uuid)) return
    this.materialOriginalValues.set(mat.uuid, {
      color: '#' + mat.color.getHexString(),
      metalness: mat.metalness,
      roughness: mat.roughness,
      normalScale: mat.normalScale?.x ?? 1,
      emissiveIntensity: mat.emissiveIntensity,
      opacity: mat.opacity,
      transparent: mat.transparent,
    })
  }

  resetMaterial(uuid: string): void {
    const mat = this.findMaterial(uuid)
    if (!mat || !(mat instanceof THREE.MeshStandardMaterial)) return
    const original = this.materialOriginalValues.get(uuid)
    if (!original) return
    if (original.color !== undefined) mat.color.set(original.color as string)
    if (original.metalness !== undefined) mat.metalness = original.metalness as number
    if (original.roughness !== undefined) mat.roughness = original.roughness as number
    if (original.normalScale !== undefined) {
      const scale = original.normalScale as number
      mat.normalScale.set(scale, scale)
    }
    if (original.emissiveIntensity !== undefined) mat.emissiveIntensity = original.emissiveIntensity as number
    if (original.opacity !== undefined) mat.opacity = original.opacity as number
    if (original.transparent !== undefined) mat.transparent = original.transparent as boolean
    mat.needsUpdate = true
    this.materialOriginalValues.delete(uuid)
  }

  resetAllMaterials(): void {
    const uuids = Array.from(this.materialOriginalValues.keys())
    uuids.forEach((uuid) => this.resetMaterial(uuid))
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

  getFloors(): FloorInfo[] {
    if (!this.currentModel) return []
    const meshes: THREE.Mesh[] = []
    this.currentModel.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) meshes.push(mesh)
    })
    if (meshes.length === 0) return []

    const hasExplicit = meshes.some((m) => {
      const ud = findUserData(m)
      return ud.floor || ud.elevation || ud.level
    })

    if (hasExplicit) {
      const groups = new Map<string, { ids: string[]; meshes: THREE.Mesh[] }>()
      meshes.forEach((mesh) => {
        const ud = findUserData(mesh)
        const key = this.getExplicitFloorKey(ud)
        if (!groups.has(key)) groups.set(key, { ids: [], meshes: [] })
        const g = groups.get(key)!
        g.ids.push(mesh.uuid)
        g.meshes.push(mesh)
      })
      return this.buildFloorInfos(groups)
    }

    return this.buildFloorInfosFromHeightClusters(meshes)
  }

  private getExplicitFloorKey(userData: Record<string, unknown>): string {
    if (userData.floor) return String(userData.floor)
    if (userData.elevation) return `标高 ${String(userData.elevation)}`
    if (userData.level) return String(userData.level)
    return '未指定楼层'
  }

  private buildFloorInfos(groups: Map<string, { ids: string[]; meshes: THREE.Mesh[] }>): FloorInfo[] {
    return Array.from(groups.entries()).map(([key, g]) => {
      const visible = g.meshes.every((m) => m.visible)
      const opacity = g.meshes.length > 0 ? this.getMeshOpacity(g.meshes[0]) : 1
      return { key, name: key, ids: g.ids, visible, opacity }
    })
  }

  private buildFloorInfosFromHeightClusters(meshes: THREE.Mesh[]): FloorInfo[] {
    const positions = meshes.map((mesh) => {
      const box = new THREE.Box3().setFromObject(mesh)
      const center = box.getCenter(new THREE.Vector3())
      return { mesh, y: center.y }
    })
    const sorted = [...positions].sort((a, b) => a.y - b.y)
    const ys = sorted.map((p) => p.y)
    const gaps: number[] = []
    for (let i = 1; i < ys.length; i++) {
      gaps.push(ys[i] - ys[i - 1])
    }
    const sortedGaps = [...gaps].sort((a, b) => a - b)
    const medianGap = sortedGaps.length > 0 ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 0
    const threshold = medianGap > 0 ? medianGap * 2 : 1

    const clusters: { y: number; items: typeof positions }[] = []
    sorted.forEach((p) => {
      const last = clusters[clusters.length - 1]
      if (!last || p.y - last.y > threshold) {
        clusters.push({ y: p.y, items: [p] })
      } else {
        last.items.push(p)
        last.y = last.items.reduce((sum, i) => sum + i.y, 0) / last.items.length
      }
    })

    const groups = new Map<string, { ids: string[]; meshes: THREE.Mesh[] }>()
    clusters.forEach((c, index) => {
      const key = `F${index + 1}`
      groups.set(key, { ids: [], meshes: [] })
      c.items.forEach((p) => {
        groups.get(key)!.ids.push(p.mesh.uuid)
        groups.get(key)!.meshes.push(p.mesh)
      })
    })
    return this.buildFloorInfos(groups)
  }

  setFloorVisibility(key: string, visible: boolean): void {
    if (!this.currentModel) return
    const ids = this.getFloorIds(key)
    this.setComponentsVisibility(ids, visible)
    this.refreshFloors()
  }

  setFloorOpacity(key: string, opacity: number): void {
    if (!this.currentModel) return
    const ids = this.getFloorIds(key)
    this.setComponentsOpacity(ids, opacity)
    this.refreshFloors()
  }

  setFloorColor(key: string, color: string): void {
    if (!this.currentModel) return
    const ids = this.getFloorIds(key)
    this.setComponentsColor(ids, color)
    this.refreshFloors()
  }

  private getFloorIds(key: string): string[] {
    return this.getFloors().find((f) => f.key === key)?.ids || []
  }

  private refreshFloors(): void {
    useViewerStore().setFloors(this.getFloors())
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

  applyPostProcessingSettings(partial: Partial<RenderSettings>): void {
    useSettingsStore().updateRender(partial)
    const render = useSettingsStore().render
    this.renderer.toneMapping = render.acesToneMapping ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping
    this.renderer.toneMappingExposure = render.acesIntensity
    this.postProcessing?.applySettings(render)
  }

  getPerformanceStats(): PerformanceStats {
    return this.performanceMonitor.getStats()
  }

  getFpsHistory(): number[] {
    return this.performanceMonitor.getFpsHistory()
  }

  startMeasurement(type: MeasurementType): void {
    useViewerStore().startMeasurement(type)
    this.clearMeasurementVisuals()
    useLogStore().add(`开始${this.getMeasurementLabel(type)}测量`, 'success', 'user')
  }

  stopMeasurement(): void {
    useViewerStore().stopMeasurement()
    this.clearMeasurementVisuals()
  }

  private clearMeasurementVisuals(): void {
    this.measurementGroup.clear()
  }

  pickMeasurementPoint(clientX: number, clientY: number): MeasurementPoint | null {
    if (!this.currentModel) return null
    const rect = this.renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
    this.measurementRaycaster.setFromCamera(mouse, this.camera)
    const intersects = this.measurementRaycaster.intersectObject(this.currentModel, true)
    if (intersects.length === 0) return null
    const point = intersects[0].point
    this.addMeasurementMarker(point)
    return { x: point.x, y: point.y, z: point.z }
  }

  private addMeasurementMarker(point: THREE.Vector3): void {
    const geometry = new THREE.SphereGeometry(0.15, 16, 16)
    const material = new THREE.MeshBasicMaterial({ color: 0x00d4ff, depthTest: false })
    const marker = new THREE.Mesh(geometry, material)
    marker.position.copy(point)
    marker.renderOrder = 999
    this.measurementGroup.add(marker)
  }

  addMeasurementLine(a: THREE.Vector3, b: THREE.Vector3): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([a, b])
    const material = new THREE.LineBasicMaterial({ color: 0x00d4ff, depthTest: false })
    const line = new THREE.Line(geometry, material)
    line.renderOrder = 999
    this.measurementGroup.add(line)
  }

  updateMeasurementResult(): void {
    const store = useViewerStore()
    const points = store.measurementPoints
    const type = store.measurementType
    if (!type || points.length === 0) {
      store.setMeasurementResult(null)
      return
    }

    this.clearMeasurementVisuals()
    points.forEach((p) => this.addMeasurementMarker(new THREE.Vector3(p.x, p.y, p.z)))

    const vecs = points.map((p) => new THREE.Vector3(p.x, p.y, p.z))
    if (type === 'distance' && vecs.length >= 2) {
      const last = vecs[vecs.length - 1]
      const prev = vecs[vecs.length - 2]
      this.addMeasurementLine(prev, last)
      const total = this.computePolylineLength(vecs)
      store.setMeasurementResult(`总距离：${total.toFixed(3)} m`)
    } else if (type === 'angle' && vecs.length >= 3) {
      const v0 = vecs[vecs.length - 3]
      const v1 = vecs[vecs.length - 2]
      const v2 = vecs[vecs.length - 1]
      this.addMeasurementLine(v0, v1)
      this.addMeasurementLine(v1, v2)
      const angle = this.computeAngle(v0, v1, v2)
      store.setMeasurementResult(`夹角：${angle.toFixed(2)}°`)
    } else if (type === 'area' && vecs.length >= 3) {
      for (let i = 0; i < vecs.length; i++) {
        this.addMeasurementLine(vecs[i], vecs[(i + 1) % vecs.length])
      }
      const area = this.computePolygonArea(vecs)
      store.setMeasurementResult(`面积：${area.toFixed(3)} m²`)
    }
  }

  private computePolylineLength(points: THREE.Vector3[]): number {
    let length = 0
    for (let i = 1; i < points.length; i++) {
      length += points[i].distanceTo(points[i - 1])
    }
    return length
  }

  private computeAngle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
    const v1 = new THREE.Vector3().subVectors(a, b)
    const v2 = new THREE.Vector3().subVectors(c, b)
    const denom = v1.length() * v2.length()
    if (denom === 0) return 0
    let cos = v1.dot(v2) / denom
    cos = Math.max(-1, Math.min(1, cos))
    return (Math.acos(cos) * 180) / Math.PI
  }

  private computePolygonArea(points: THREE.Vector3[]): number {
    let area = 0
    for (let i = 1; i < points.length - 1; i++) {
      const v0 = points[0]
      const v1 = points[i]
      const v2 = points[i + 1]
      const e1 = new THREE.Vector3().subVectors(v1, v0)
      const e2 = new THREE.Vector3().subVectors(v2, v0)
      area += new THREE.Vector3().crossVectors(e1, e2).length() / 2
    }
    return area
  }

  private getMeasurementLabel(type: MeasurementType): string {
    return { distance: '距离', angle: '角度', area: '面积' }[type]
  }

  getSceneStatus() {
    const viewer = useViewerStore()
    return {
      mode: viewer.mode,
      modelLoaded: viewer.modelLoaded,
      selectedComponentId: viewer.selectedComponent?.id || null,
      selectedNodeUuid: viewer.selectedNodeUuid,
      renderQuality: viewer.renderQuality,
    }
  }

  getSceneTree(): SceneTreeNode[] {
    if (!this.currentModel) return []
    return [this.buildSceneTreeNode(this.currentModel)]
  }

  private buildSceneTreeNode(obj: THREE.Object3D): SceneTreeNode {
    const type = this.getSceneTreeNodeType(obj)
    const children: SceneTreeNode[] = []
    obj.children.forEach((child) => {
      if (child === this.gridHelper || child === this.zeroGridHelper) return
      children.push(this.buildSceneTreeNode(child))
    })
    return {
      id: obj.uuid,
      uuid: obj.uuid,
      name: obj.name || `${type}_${obj.uuid.slice(0, 6)}`,
      type,
      visible: obj.visible,
      children,
    }
  }

  private getSceneTreeNodeType(obj: THREE.Object3D): SceneTreeNode['type'] {
    if (obj.type === 'Scene') return 'Scene'
    if ((obj as THREE.Mesh).isMesh) return 'Mesh'
    if ((obj as THREE.Light).isLight) return 'Light'
    if ((obj as THREE.Camera).isCamera) return 'Camera'
    if ((obj as THREE.Bone).isBone) return 'Bone'
    if (obj.type === 'Group') return 'Group'
    return 'Object3D'
  }

  selectNode(uuid: string): void {
    const obj = this.findObjectByUuid(uuid)
    if (!obj) return
    this.deselectNode()
    this.selectedNode = obj
    useViewerStore().selectNode(uuid)
    this.highlightSelectedNode()
  }

  focusNode(uuid: string): void {
    const obj = this.findObjectByUuid(uuid)
    if (!obj) return
    const box = new THREE.Box3().setFromObject(obj)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 0.01)
    const distance = maxDim * 1.5
    const offset = this.getCameraDirection().multiplyScalar(distance)
    this.camera.position.copy(center).add(offset)
    this.camera.lookAt(center)
    this.orbit.controls.target.copy(center)
    this.orbit.controls.update()
    useLogStore().add('聚焦节点', 'success', 'user', obj.name || uuid)
  }

  setNodeVisibility(uuid: string, visible: boolean): void {
    const obj = this.findObjectByUuid(uuid)
    if (!obj) return
    obj.traverse((o) => {
      o.visible = visible
    })
  }

  getModelStats(): ModelStats | null {
    if (!this.currentModel) return null
    let vertexCount = 0
    let triangleCount = 0
    let nodeCount = 0
    let meshCount = 0
    const materials = new Set<THREE.Material>()
    const textures = new Set<THREE.Texture>()
    this.currentModel.traverse((obj) => {
      nodeCount++
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        meshCount++
        const geometry = mesh.geometry
        if (geometry.index) {
          triangleCount += geometry.index.count / 3
        } else {
          triangleCount += geometry.attributes.position.count / 3
        }
        vertexCount += geometry.attributes.position.count
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => {
          materials.add(mat)
          this.collectTextures(mat, textures)
        })
      }
    })
    const fileSize = useViewerStore().modelInfo?.fileSize || 0
    return {
      vertexCount: Math.floor(vertexCount),
      triangleCount: Math.floor(triangleCount),
      nodeCount,
      meshCount,
      materialCount: materials.size,
      textureCount: textures.size,
      fileSize,
    }
  }

  private collectTextures(material: THREE.Material, set: Set<THREE.Texture>): void {
    const record = material as unknown as Record<string, unknown>
    for (const key in record) {
      const value = record[key]
      if (value instanceof THREE.Texture) {
        set.add(value)
      }
      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v instanceof THREE.Texture) set.add(v)
        })
      }
    }
  }

  getNodeProperties(uuid: string): NodeProperties | null {
    const obj = this.findObjectByUuid(uuid)
    if (!obj) return null
    const mesh = obj as THREE.Mesh
    const materialNames: string[] = []
    if (mesh.isMesh) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat) => materialNames.push(mat.name || mat.type || '未命名材质'))
    }
    const worldPosition = new THREE.Vector3()
    obj.getWorldPosition(worldPosition)
    return {
      uuid: obj.uuid,
      name: obj.name || '未命名节点',
      type: obj.type,
      position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
      rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
      quaternion: { x: obj.quaternion.x, y: obj.quaternion.y, z: obj.quaternion.z, w: obj.quaternion.w },
      scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
      worldPosition: { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z },
      userData: { ...obj.userData },
      materialNames: materialNames.length ? materialNames : undefined,
    }
  }

  getNodeGeometryStats(uuid: string): { vertexCount: number; triangleCount: number } {
    const obj = this.findObjectByUuid(uuid)
    let vertexCount = 0
    let triangleCount = 0
    if (!obj) return { vertexCount, triangleCount }
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const geometry = mesh.geometry
      if (geometry.index) {
        triangleCount += geometry.index.count / 3
      } else {
        triangleCount += geometry.attributes.position.count / 3
      }
      vertexCount += geometry.attributes.position.count
    })
    return { vertexCount: Math.floor(vertexCount), triangleCount: Math.floor(triangleCount) }
  }

  private findObjectByUuid(uuid: string): THREE.Object3D | null {
    if (!this.currentModel) return null
    let found: THREE.Object3D | null = null
    this.currentModel.traverse((obj) => {
      if (obj.uuid === uuid) found = obj
    })
    return found
  }

  private highlightSelectedNode(): void {
    if (!this.selectedNode) return
    this.selectedNode.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (!this.selectedNodeOriginalEmissive.has(mesh.uuid)) {
            this.selectedNodeOriginalEmissive.set(mesh.uuid, {
              color: mat.emissive.clone(),
              intensity: mat.emissiveIntensity,
            })
          }
          mat.emissive.set(0x00d4ff)
          mat.emissiveIntensity = 0.6
          mat.needsUpdate = true
        }
      })
    })
  }

  private deselectNode(): void {
    this.selectedNodeOriginalEmissive.forEach((stored, uuid) => {
      const obj = this.findObjectByUuid(uuid)
      if (!obj) return
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.emissive.copy(stored.color)
          mat.emissiveIntensity = stored.intensity
          mat.needsUpdate = true
        }
      })
    })
    this.selectedNodeOriginalEmissive.clear()
    this.selectedNode = null
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
    this.stopRegionZoom()
    this.postProcessing?.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
