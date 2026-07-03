import type { BIMViewer } from '@/core/BIMViewer'
import type { APIResponse, ComponentData, ModelInfo, RoamingSpeed, ClipAxis } from '@/types'
import { useSettingsStore } from '@/stores/settingsStore'
import { useLogStore } from '@/stores/logStore'

type EventCallback = (data: unknown) => void

export class BIMViewerSDK {
  private viewer: BIMViewer | null = null
  private events = new Map<string, Set<EventCallback>>()

  constructor(viewer?: BIMViewer) {
    if (viewer) this.attach(viewer)
  }

  attach(viewer: BIMViewer): void {
    this.viewer = viewer
  }

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback)
  }

  off(event: string, callback: EventCallback): void {
    this.events.get(event)?.delete(callback)
  }

  emit(event: string, data: unknown): void {
    this.events.get(event)?.forEach((cb) => cb(data))
  }

  private response<T>(code: APIResponse<T>['code'], message: string, data: T): APIResponse<T> {
    return { code, message, data, timestamp: Date.now() }
  }

  private checkOrigin(): boolean {
    const settings = useSettingsStore().settings
    if (!settings.apiEnabled) return false
    if (settings.allowedOrigins.includes('*')) return true
    return settings.allowedOrigins.includes(window.location.origin)
  }

  loadModel(files: File[]): Promise<APIResponse<ModelInfo | null>> {
    if (!this.checkOrigin()) return Promise.resolve(this.response(400, '当前域名未授权', null as unknown as ModelInfo))
    if (!this.viewer) return Promise.resolve(this.response(404, '渲染器未初始化', null as unknown as ModelInfo))
    useLogStore().add('外部API调用：加载模型', 'success', 'api')
    return this.viewer.loadModel(files)
  }

  resetView(): APIResponse<null> {
    if (!this.checkOrigin()) return this.response(400, '当前域名未授权', null)
    if (!this.viewer) return this.response(404, '渲染器未初始化', null)
    this.viewer.resetView()
    useLogStore().add('外部API调用：重置视角', 'success', 'api')
    return this.response(200, '成功', null)
  }

  resetScene(): APIResponse<null> {
    if (!this.checkOrigin()) return this.response(400, '当前域名未授权', null)
    if (!this.viewer) return this.response(404, '渲染器未初始化', null)
    this.viewer.resetScene()
    useLogStore().add('外部API调用：重置场景', 'success', 'api')
    return this.response(200, '成功', null)
  }

  clearModel(): APIResponse<null> {
    if (!this.checkOrigin()) return this.response(400, '当前域名未授权', null)
    if (!this.viewer) return this.response(404, '渲染器未初始化', null)
    this.viewer.clearModel()
    useLogStore().add('外部API调用：清空模型', 'success', 'api')
    return this.response(200, '成功', null)
  }

  setMode(mode: 'view' | 'clip' | 'roam'): APIResponse<null> {
    if (!this.checkOrigin()) return this.response(400, '当前域名未授权', null)
    if (!this.viewer) return this.response(404, '渲染器未初始化', null)
    this.viewer.setMode(mode)
    useLogStore().add(`外部API调用：切换模式 ${mode}`, 'success', 'api')
    return this.response(200, '成功', null)
  }

  setClipAxis(axis: ClipAxis): APIResponse<null> {
    if (!this.checkOrigin()) return this.response(400, '当前域名未授权', null)
    if (!this.viewer) return this.response(404, '渲染器未初始化', null)
    this.viewer.setClipAxis(axis)
    return this.response(200, '成功', null)
  }

  setClipOffset(offset: number): APIResponse<null> {
    if (!this.checkOrigin()) return this.response(400, '当前域名未授权', null)
    if (!this.viewer) return this.response(404, '渲染器未初始化', null)
    this.viewer.setClipOffset(offset)
    return this.response(200, '成功', null)
  }

  setRoamingSpeed(speed: RoamingSpeed): APIResponse<null> {
    if (!this.checkOrigin()) return this.response(400, '当前域名未授权', null)
    if (!this.viewer) return this.response(404, '渲染器未初始化', null)
    this.viewer.setRoamingSpeed(speed)
    return this.response(200, '成功', null)
  }

  selectComponentById(id: string): APIResponse<ComponentData | null> {
    if (!this.checkOrigin()) return this.response(400, '当前域名未授权', null)
    if (!this.viewer) return this.response(404, '渲染器未初始化', null)
    const data = this.viewer.selectComponentById(id)
    return this.response(200, '成功', data)
  }

  applyRenderSettings(settings: Partial<ReturnType<typeof useSettingsStore>['render']>): APIResponse<null> {
    if (!this.checkOrigin()) return this.response(400, '当前域名未授权', null)
    const store = useSettingsStore()
    store.updateRender(settings)
    this.viewer?.applySettings(store.settings)
    return this.response(200, '成功', null)
  }

  getSceneStatus(): APIResponse<ReturnType<BIMViewer['getSceneStatus']>> {
    if (!this.checkOrigin()) return this.response(400, '当前域名未授权', null as unknown as ReturnType<BIMViewer['getSceneStatus']>)
    if (!this.viewer) return this.response(404, '渲染器未初始化', null as unknown as ReturnType<BIMViewer['getSceneStatus']>)
    return this.response(200, '成功', this.viewer.getSceneStatus())
  }
}

export const sdkInstance = new BIMViewerSDK()
