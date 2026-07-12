import { ref, watch, onUnmounted, type Ref } from 'vue'

interface ResizableOptions {
  minWidth?: number
  minHeight?: number
}

export function useResizable(elRef: Ref<HTMLElement | null>, options: ResizableOptions = {}) {
  const style = ref<{ width: string; height: string }>({ width: '', height: '' })

  let removeListener: (() => void) | null = null
  let removeDocListeners: (() => void) | null = null

  const setup = (el: HTMLElement) => {
    const minWidth = options.minWidth ?? 200
    const minHeight = options.minHeight ?? 120

    const clampSize = (width: number, height: number) => {
      const parent = el.offsetParent as HTMLElement | null
      if (!parent) return { width, height }
      const computed = getComputedStyle(el)
      const top = parseFloat(computed.top) || 0
      const bottom = parseFloat(computed.bottom) || 0
      const left = parseFloat(computed.left) || 0
      const right = parseFloat(computed.right) || 0

      let maxWidth = parent.clientWidth - el.offsetLeft - 8
      if (right > 0 && left > 0) {
        maxWidth = parent.clientWidth - left - right - 8
      }

      let maxHeight = parent.clientHeight - el.offsetTop - 8
      if (bottom > 0) {
        maxHeight = parent.clientHeight - bottom - 8
      } else if (top > 0 && !isNaN(top)) {
        maxHeight = parent.clientHeight - top - 8
      }

      return {
        width: Math.max(minWidth, Math.min(width, maxWidth)),
        height: Math.max(minHeight, Math.min(height, maxHeight)),
      }
    }

    // Measure the natural size before applying an explicit width/height.
    const rect = el.getBoundingClientRect()
    const clampedInitial = clampSize(Math.max(rect.width, minWidth), Math.max(rect.height, minHeight))
    style.value.width = `${clampedInitial.width}px`
    style.value.height = `${clampedInitial.height}px`

    const handle = el.querySelector('.panel-resize-handle') as HTMLElement | null
    if (!handle) return

    let isResizing = false
    let startX = 0
    let startY = 0
    let startWidth = 0
    let startHeight = 0

    const onMove = (e: MouseEvent) => {
      if (!isResizing) return
      const dw = e.clientX - startX
      const dh = e.clientY - startY
      const nextWidth = startWidth + dw
      const nextHeight = startHeight + dh
      const clamped = clampSize(nextWidth, nextHeight)
      style.value.width = `${clamped.width}px`
      style.value.height = `${clamped.height}px`
    }

    const onUp = () => {
      isResizing = false
      if (removeDocListeners) {
        removeDocListeners()
        removeDocListeners = null
      }
    }

    const onDown = (e: MouseEvent) => {
      e.stopPropagation()
      isResizing = true
      startX = e.clientX
      startY = e.clientY
      startWidth = parseFloat(style.value.width) || rect.width
      startHeight = parseFloat(style.value.height) || rect.height

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      removeDocListeners = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
    }

    handle.addEventListener('mousedown', onDown)
    removeListener = () => {
      handle.removeEventListener('mousedown', onDown)
    }
  }

  watch(
    () => elRef.value,
    (el) => {
      if (removeListener) {
        removeListener()
        removeListener = null
      }
      if (removeDocListeners) {
        removeDocListeners()
        removeDocListeners = null
      }
      if (el) setup(el)
    },
    { flush: 'post', immediate: true }
  )

  onUnmounted(() => {
    if (removeListener) removeListener()
    if (removeDocListeners) removeDocListeners()
  })

  return { style }
}
