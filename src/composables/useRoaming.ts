import { computed } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { viewer } from './useBIMViewer'
import type { RoamingSpeed } from '@/types'

export function useRoaming() {
  const viewerStore = useViewerStore()
  const settingsStore = useSettingsStore()

  const isRoaming = computed(() => viewerStore.isRoaming)
  const speed = computed({
    get: () => settingsStore.general.roamingSpeed,
    set: (val: RoamingSpeed) => {
      settingsStore.updateGeneral({ roamingSpeed: val })
      viewer.value?.setRoamingSpeed(val)
    },
  })

  function toggleRoaming() {
    viewer.value?.toggleRoaming()
  }

  function exitRoaming() {
    viewer.value?.setMode('view')
  }

  return {
    isRoaming,
    speed,
    toggleRoaming,
    exitRoaming,
  }
}
