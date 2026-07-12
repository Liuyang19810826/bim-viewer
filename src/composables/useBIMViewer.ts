import { shallowRef, ref, onMounted, onUnmounted } from 'vue'
import { BIMViewer } from '@/core/BIMViewer'
import { useSettingsStore } from '@/stores/settingsStore'
import { sdkInstance } from '@/api/SDK'
import { startIframeBridge } from '@/api/IframeBridge'

export const viewer = shallowRef<BIMViewer | null>(null)
export const containerRef = ref<HTMLElement | null>(null)

export function useBIMViewer() {
  const settingsStore = useSettingsStore()

  onMounted(() => {
    if (containerRef.value && !viewer.value) {
      const instance = new BIMViewer({ container: containerRef.value })
      instance.applySettings(settingsStore.settings)
      viewer.value = instance
      ;(window as any).__viewer = instance
      sdkInstance.attach(instance)
      startIframeBridge()
    }
  })

  onUnmounted(() => {
    viewer.value?.dispose()
    viewer.value = null
  })

  return {
    viewer,
    containerRef,
  }
}
