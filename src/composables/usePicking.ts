import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from './useBIMViewer'

export function usePicking() {
  const store = useViewerStore()

  function onCanvasClick(event: MouseEvent) {
    if (store.isRoaming || store.isClipping) return
    const v = viewer.value
    if (!v || !store.modelLoaded) return

    const data = v.pickComponent(event.clientX, event.clientY)
    if (!data) {
      v.clearSelection()
    }
  }

  return {
    onCanvasClick,
  }
}
