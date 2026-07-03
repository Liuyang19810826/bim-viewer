import { sdkInstance } from './SDK'
import type { APIResponse } from '@/types'

export function startIframeBridge(): void {
  window.addEventListener('message', async (event) => {
    const data = event.data
    if (!data || typeof data !== 'object' || !data.method) return

    const { method, params = {}, requestId } = data
    let result: APIResponse<unknown> = { code: 400, message: '未知方法', data: null, timestamp: Date.now() }

    try {
      switch (method) {
        case 'loadModel':
          result = await sdkInstance.loadModel(params.files)
          break
        case 'resetView':
          result = sdkInstance.resetView()
          break
        case 'resetScene':
          result = sdkInstance.resetScene()
          break
        case 'clearModel':
          result = sdkInstance.clearModel()
          break
        case 'setMode':
          result = sdkInstance.setMode(params.mode)
          break
        case 'setClipAxis':
          result = sdkInstance.setClipAxis(params.axis)
          break
        case 'setClipOffset':
          result = sdkInstance.setClipOffset(params.offset)
          break
        case 'setRoamingSpeed':
          result = sdkInstance.setRoamingSpeed(params.speed)
          break
        case 'selectComponentById':
          result = sdkInstance.selectComponentById(params.id)
          break
        case 'applyRenderSettings':
          result = sdkInstance.applyRenderSettings(params.settings)
          break
        case 'getSceneStatus':
          result = sdkInstance.getSceneStatus()
          break
      }
    } catch (error) {
      result = { code: 500, message: (error as Error).message, data: null, timestamp: Date.now() }
    }

    if (event.source && requestId) {
      event.source.postMessage({ requestId, result }, { targetOrigin: event.origin })
    }
  })
}
