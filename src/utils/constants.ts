import type { AppSettings, RoamingSpeed } from '@/types'

export const ROAMING_SPEEDS: Record<RoamingSpeed, number> = {
  slow: 3,
  normal: 8,
  fast: 16,
}

export const DEFAULT_SETTINGS: AppSettings = {
  render: {
    preset: 'solid',
    metalness: 0.2,
    roughness: 0.7,
    opacity: 1,
    emissiveIntensity: 0,
    acesToneMapping: true,
    acesIntensity: 1,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    colorTemperature: 6500,
    srgbOutput: true,
    ssaoEnabled: true,
    ssaoIntensity: 1,
    ssaoRadius: 0.5,
    ssaoPrecision: 16,
    fxaaEnabled: true,
    fxaaLevel: 1,
    bloomEnabled: true,
    bloomStrength: 0.2,
    bloomRadius: 0.5,
    bloomThreshold: 0.9,
    shadowEnabled: true,
    shadowResolution: 2048,
    shadowBlur: 2,
    shadowRange: 50,
    shadowDepth: 50,
    shadowSoft: true,
    ambientIntensity: 0.3,
    ambientColor: '#ffffff',
    directionalIntensity: 0.8,
    directionalColor: '#ffffff',
    directionalPosition: { x: 50, y: 80, z: 50 },
    directionalTarget: { x: 0, y: 0, z: 0 },
  },
  general: {
    backgroundColor: '#0a0f1a',
    highlightColor: '#00d4ff',
    zoomSpeed: 1,
    panSensitivity: 1,
    roamingSpeed: 'normal',
    propertyPanelVisible: true,
    logPanelVisible: true,
    floorPanelVisible: true,
    loadingAnimation: true,
    operationHints: true,
  },
  apiEnabled: true,
  allowedOrigins: ['*'],
}

export const MODE_LABELS = {
  view: '普通查看',
  clip: '剖切模式',
  roam: '漫游模式',
}

export const CLIP_AXIS_LABELS = {
  x: 'X 轴（横向）',
  y: 'Y 轴（纵向）',
  z: 'Z 轴（竖向）',
}

export const SETTINGS_STORAGE_KEY = 'bim-viewer-settings-v1'
export const LOGS_STORAGE_KEY = 'bim-viewer-logs-v1'
export const MAX_LOG_ENTRIES = 200

export const COLOR_PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#d946ef',
  '#64748b',
]
