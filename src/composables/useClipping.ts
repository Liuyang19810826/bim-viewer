import { reactive, computed } from 'vue'
import { useViewerStore } from '@/stores/viewerStore'
import { viewer } from './useBIMViewer'
import type { ClipAxis } from '@/types'

export function useClipping() {
  const state = reactive({
    axis: 'z' as ClipAxis,
    offset: 0,
    minOffset: -50,
    maxOffset: 50,
    isClipping: computed(() => useViewerStore().isClipping),
  })

  function toggleClipping() {
    viewer.value?.toggleClipping()
  }

  function setAxis(newAxis: ClipAxis) {
    state.axis = newAxis
    viewer.value?.setClipAxis(newAxis)
  }

  function setOffset(value: number) {
    state.offset = value
    viewer.value?.setClipOffset(value)
  }

  function resetClip() {
    state.offset = 0
    viewer.value?.setClipOffset(0)
  }

  return Object.assign(state, {
    toggleClipping,
    setAxis,
    setOffset,
    resetClip,
  })
}
