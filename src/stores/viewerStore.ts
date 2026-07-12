import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ViewerMode, ComponentData, ModelInfo, LoadProgress, FloorInfo, LoadSummary, ModelStats, ValidationReport, PerformanceStats, MeasurementType, MeasurementPoint, ScreenRect, HumanEyeState, RenderPreset } from '@/types'

export const useViewerStore = defineStore('viewer', () => {
  const mode = ref<ViewerMode>('view')
  const isLoading = ref(false)
  const loadProgress = ref<LoadProgress>({ loaded: 0, total: 0, percentage: 0 })
  const modelLoaded = ref(false)
  const modelInfo = ref<ModelInfo | null>(null)
  const modelStats = ref<ModelStats | null>(null)
  const selectedComponent = ref<ComponentData | null>(null)
  const selectedNodeUuid = ref<string | null>(null)
  const floors = ref<FloorInfo[]>([])
  const showSceneTreePanel = ref(false)
  const showModelStatsPanel = ref(false)
  const showNodePropertiesPanel = ref(false)
  const showMaterialPanel = ref(false)
  const showLightingPanel = ref(false)
  const showPostProcessingPanel = ref(false)
  const showValidationPanel = ref(false)
  const showPerformancePanel = ref(false)
  const showMeasurementPanel = ref(false)
  const selectedMaterialUuid = ref<string | null>(null)
  const gltfValidation = ref<ValidationReport | null>(null)
  const performanceStats = ref<PerformanceStats | null>(null)
  const measurementActive = ref(false)
  const measurementType = ref<MeasurementType | null>(null)
  const measurementPoints = ref<MeasurementPoint[]>([])
  const measurementResult = ref<string | null>(null)
  const selectedFloorKey = ref<string | null>(null)
  const showRegionZoomPanel = ref(false)
  const regionZoomActive = ref(false)
  const regionZoomBox = ref<ScreenRect | null>(null)
  const humanEye = ref<HumanEyeState>({
    open: false,
    picking: false,
    target: null,
    eyeHeight: 1.6,
    preset: 'solid',
  })
  const loadSummary = ref<LoadSummary | null>(null)
  const statusMessage = ref('就绪')
  const renderQuality = ref('高品质')

  const isRoaming = computed(() => mode.value === 'roam')
  const isClipping = computed(() => mode.value === 'clip')
  const isViewing = computed(() => mode.value === 'view')

  function setMode(newMode: ViewerMode) {
    mode.value = newMode
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading
  }

  function setLoadProgress(progress: LoadProgress) {
    loadProgress.value = progress
  }

  function setModelLoaded(loaded: boolean) {
    modelLoaded.value = loaded
  }

  function setModelInfo(info: ModelInfo | null) {
    modelInfo.value = info
  }

  function setModelStats(stats: ModelStats | null) {
    modelStats.value = stats
  }

  function selectComponent(component: ComponentData | null) {
    selectedComponent.value = component
  }

  function selectNode(uuid: string | null) {
    selectedNodeUuid.value = uuid
  }

  function setShowSceneTreePanel(show: boolean) {
    showSceneTreePanel.value = show
  }

  function setShowModelStatsPanel(show: boolean) {
    showModelStatsPanel.value = show
  }

  function setShowNodePropertiesPanel(show: boolean) {
    showNodePropertiesPanel.value = show
  }

  function setFloors(list: FloorInfo[]) {
    floors.value = list
  }

  function selectFloor(key: string | null) {
    selectedFloorKey.value = key
  }

  function setLoadSummary(summary: LoadSummary | null) {
    loadSummary.value = summary
  }

  function setStatusMessage(msg: string) {
    statusMessage.value = msg
  }

  function setRenderQuality(quality: string) {
    renderQuality.value = quality
  }

  function setShowMaterialPanel(show: boolean) {
    showMaterialPanel.value = show
  }

  function setShowLightingPanel(show: boolean) {
    showLightingPanel.value = show
  }

  function setShowPostProcessingPanel(show: boolean) {
    showPostProcessingPanel.value = show
  }

  function setShowValidationPanel(show: boolean) {
    showValidationPanel.value = show
  }

  function setShowPerformancePanel(show: boolean) {
    showPerformancePanel.value = show
  }

  function setShowMeasurementPanel(show: boolean) {
    showMeasurementPanel.value = show
  }

  function setGltfValidation(report: ValidationReport | null) {
    gltfValidation.value = report
  }

  function setPerformanceStats(stats: PerformanceStats | null) {
    performanceStats.value = stats
  }

  function startMeasurement(type: MeasurementType) {
    measurementActive.value = true
    measurementType.value = type
    measurementPoints.value = []
    measurementResult.value = null
  }

  function stopMeasurement() {
    measurementActive.value = false
    measurementType.value = null
    measurementPoints.value = []
    measurementResult.value = null
  }

  function addMeasurementPoint(point: MeasurementPoint) {
    measurementPoints.value.push(point)
  }

  function setMeasurementResult(result: string | null) {
    measurementResult.value = result
  }

  function selectMaterial(uuid: string | null) {
    selectedMaterialUuid.value = uuid
  }

  function setShowRegionZoomPanel(show: boolean) {
    showRegionZoomPanel.value = show
    if (!show) {
      regionZoomActive.value = false
      regionZoomBox.value = null
    }
  }

  function setRegionZoomActive(active: boolean) {
    regionZoomActive.value = active
    if (!active) regionZoomBox.value = null
  }

  function setRegionZoomBox(box: ScreenRect | null) {
    regionZoomBox.value = box
  }

  function setHumanEyeOpen(open: boolean) {
    humanEye.value.open = open
    if (!open) {
      humanEye.value.picking = false
      humanEye.value.target = null
    }
  }

  function setHumanEyePicking(picking: boolean) {
    humanEye.value.picking = picking
  }

  function setHumanEyeTarget(point: { x: number; y: number; z: number } | null) {
    humanEye.value.target = point
  }

  function setHumanEyeHeight(height: number) {
    humanEye.value.eyeHeight = height
  }

  function setHumanEyePreset(preset: RenderPreset) {
    humanEye.value.preset = preset
  }

  return {
    mode,
    isLoading,
    loadProgress,
    modelLoaded,
    modelInfo,
    modelStats,
    selectedComponent,
    selectedNodeUuid,
    floors,
    showSceneTreePanel,
    showModelStatsPanel,
    showNodePropertiesPanel,
    showMaterialPanel,
    showLightingPanel,
    showPostProcessingPanel,
    showValidationPanel,
    showPerformancePanel,
    showMeasurementPanel,
    showRegionZoomPanel,
    regionZoomActive,
    regionZoomBox,
    humanEye,
    selectedMaterialUuid,
    gltfValidation,
    performanceStats,
    measurementActive,
    measurementType,
    measurementPoints,
    measurementResult,
    selectedFloorKey,
    loadSummary,
    statusMessage,
    renderQuality,
    isRoaming,
    isClipping,
    isViewing,
    setMode,
    setLoading,
    setLoadProgress,
    setModelLoaded,
    setModelInfo,
    setModelStats,
    selectComponent,
    selectNode,
    setFloors,
    setShowSceneTreePanel,
    setShowModelStatsPanel,
    setShowNodePropertiesPanel,
    setShowMaterialPanel,
    setShowLightingPanel,
    setShowPostProcessingPanel,
    setShowValidationPanel,
    setShowPerformancePanel,
    setShowMeasurementPanel,
    setGltfValidation,
    setPerformanceStats,
    startMeasurement,
    stopMeasurement,
    addMeasurementPoint,
    setMeasurementResult,
    selectMaterial,
    selectFloor,
    setLoadSummary,
    setStatusMessage,
    setRenderQuality,
    setShowRegionZoomPanel,
    setRegionZoomActive,
    setRegionZoomBox,
    setHumanEyeOpen,
    setHumanEyePicking,
    setHumanEyeTarget,
    setHumanEyeHeight,
    setHumanEyePreset,
  }
})
