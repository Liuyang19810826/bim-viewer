import { onMounted, onUnmounted } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from './useBIMViewer'

export function useKeyboard() {
  const store = useViewerStore()

  function onKeyDown(event: KeyboardEvent) {
    if (event.code === 'Escape' && store.isRoaming) {
      viewer.value?.setMode('view')
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
  })
}
