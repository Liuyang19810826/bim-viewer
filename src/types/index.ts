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
  fileSize: number
}

export interface SceneTreeNode {
  id: string
  uuid: string
  name: string
  type: 'Scene' | 'Group' | 'Object3D' | 'Mesh' | 'Material' | 'Light' | 'Camera' | 'Bone' | 'Other'
  visible: boolean
  children: SceneTreeNode[]
}

export interface ModelStats {
  vertexCount: number
  triangleCount: number
  nodeCount: number
  meshCount: number
  materialCount: number
  textureCount: number
  fileSize: number
}

export interface NodeProperties {
  uuid: string
  name: string
  type: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  quaternion: { x: number; y: number; z: number; w: number }
  scale: { x: number; y: number; z: number }
  worldPosition: { x: number; y: number; z: number }
  userData: Record<string, unknown>
  materialNames?: string[]
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
  shadowSoft: boolean
  ambientIntensity: number
  ambientColor: string
  directionalIntensity: number
  directionalColor: string
  directionalPosition: { x: number; y: number; z: number }
  directionalTarget: { x: number; y: number; z: number }
}

export interface MaterialInfo {
  uuid: string
  name: string
  type: string
  color: string
  metalness: number
  roughness: number
  normalScale: number
  emissiveIntensity: number
  opacity: number
  transparent: boolean
}

export interface ValidationMessage {
  type: 'error' | 'warning' | 'info'
  path: string
  message: string
}

export interface ValidationReport {
  valid: boolean
  errors: ValidationMessage[]
  warnings: ValidationMessage[]
  infos: ValidationMessage[]
  summary: string
}

export interface PerformanceStats {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  timestamp: number
}

export type MeasurementType = 'distance' | 'angle' | 'area'

export interface MeasurementPoint {
  x: number
  y: number
  z: number
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

export interface FloorInfo {
  key: string
  name: string
  ids: string[]
  visible: boolean
  opacity: number
}

export interface LoadSummary {
  name: string
  componentCount: number
  vertexCount: number
  triangleCount: number
  floors: FloorInfo[]
}

export interface ScreenRect {
  x: number
  y: number
  width: number
  height: number
}

export interface HumanEyeState {
  open: boolean
  picking: boolean
  target: { x: number; y: number; z: number } | null
  eyeHeight: number
  preset: RenderPreset
}

export interface GeneralSettings {
  backgroundColor: string
  highlightColor: string
  zoomSpeed: number
  panSensitivity: number
  roamingSpeed: RoamingSpeed
  propertyPanelVisible: boolean
  logPanelVisible: boolean
  floorPanelVisible: boolean
  loadingAnimation: boolean
  operationHints: boolean
}

export interface AppSettings {
  render: RenderSettings
  general: GeneralSettings
  apiEnabled: boolean
  allowedOrigins: string[]
}
