import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ViewerMode, ComponentData, ModelInfo, LoadProgress, FloorInfo } from '@/types'

export const useViewerStore = defineStore('viewer', () => {
  const mode = ref<ViewerMode>('view')
  const isLoading = ref(false)
  const loadProgress = ref<LoadProgress>({ loaded: 0, total: 0, percentage: 0 })
  const modelLoaded = ref(false)
  const modelInfo = ref<ModelInfo | null>(null)
  const selectedComponent = ref<ComponentData | null>(null)
  const floors = ref<FloorInfo[]>([])
  const selectedFloorKey = ref<string | null>(null)
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

  function selectComponent(component: ComponentData | null) {
    selectedComponent.value = component
  }

  function setFloors(list: FloorInfo[]) {
    floors.value = list
  }

  function selectFloor(key: string | null) {
    selectedFloorKey.value = key
  }

  function setStatusMessage(msg: string) {
    statusMessage.value = msg
  }

  function setRenderQuality(quality: string) {
    renderQuality.value = quality
  }

  return {
    mode,
    isLoading,
    loadProgress,
    modelLoaded,
    modelInfo,
    selectedComponent,
    floors,
    selectedFloorKey,
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
    selectComponent,
    setFloors,
    selectFloor,
    setStatusMessage,
    setRenderQuality,
  }
})
