import * as THREE from 'three'

export type ViewerMode = 'view' | 'clip' | 'roam'

export type ClipAxis = 'x' | 'y' | 'z'

export type RoamingSpeed = 'slow' | 'normal' | 'fast'

export interface ComponentProperty {
  key: string
  value: string | number | boolean | null
}

export interface ComponentData {
  id: string
  name: string
  type: string
  properties: ComponentProperty[]
}

export interface ModelInfo {
  name: string
  componentCount: number
  vertexCount: number
  triangleCount: number
}

export interface LoadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface APIResponse<T = unknown> {
  code: 200 | 400 | 404 | 500
  message: string
  data: T
  timestamp: number
}

export interface SDKOptions {
  container?: HTMLElement | string
  enableIframeBridge?: boolean
  allowedOrigins?: string[]
}

export interface LogEntry {
  id: string
  time: string
  action: string
  status: 'success' | 'fail'
  source: 'user' | 'api'
  detail?: string
}

export type RenderPreset =
  | 'solid'
  | 'discipline'
  | 'system'
  | 'wireframe-solid'
  | 'hidden-wireframe'
  | 'transparency'
  | 'highlight-type'
  | 'section-cut'

export interface RenderSettings {
  preset: RenderPreset
  metalness: number
  roughness: number
  opacity: number
  emissiveIntensity: number
  acesToneMapping: boolean
  acesIntensity: number
  brightness: number
  contrast: number
  saturation: number
  colorTemperature: number
  srgbOutput: boolean
  ssaoEnabled: boolean
  ssaoIntensity: number
  ssaoRadius: number
  ssaoPrecision: number
  fxaaEnabled: boolean
  fxaaLevel: number
  bloomEnabled: boolean
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
  shadowEnabled: boolean
  shadowResolution: number
  shadowBlur: number
  shadowRange: number
  shadowDepth: number
}

export interface ComponentTreeItem {
  id: string
  name: string
  type: string
  discipline: string
  system: string
  visible: boolean
  opacity: number
  object: THREE.Object3D
  children: ComponentTreeItem[]
}

export interface GeneralSettings {
  backgroundColor: string
  highlightColor: string
  zoomSpeed: number
  panSensitivity: number
  roamingSpeed: RoamingSpeed
  propertyPanelVisible: boolean
  logPanelVisible: boolean
  loadingAnimation: boolean
  operationHints: boolean
}

export interface AppSettings {
  render: RenderSettings
  general: GeneralSettings
  apiEnabled: boolean
  allowedOrigins: string[]
}
