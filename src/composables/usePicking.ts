import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from './useBIMViewer'

export function usePicking() {
  const store = useViewerStore()

  function onCanvasClick(event: MouseEvent) {
    if (store.isRoaming || store.isClipping) return
    if (store.regionZoomActive) return
    const v = viewer.value
    if (!v || !store.modelLoaded) return

    if (store.humanEye.picking) {
      const point = v.pickMeasurementPoint(event.clientX, event.clientY)
      if (point) {
        store.setHumanEyeTarget(point)
        store.setHumanEyePicking(false)
      }
      return
    }

    if (store.measurementActive) {
      const point = v.pickMeasurementPoint(event.clientX, event.clientY)
      if (point) {
        store.addMeasurementPoint(point)
        v.updateMeasurementResult()
      }
      return
    }

    const data = v.pickComponent(event.clientX, event.clientY)
    if (!data) {
      v.clearSelection()
    }
  }

  return {
    onCanvasClick,
  }
}
