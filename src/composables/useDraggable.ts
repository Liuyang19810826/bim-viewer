import { ref, watch, onUnmounted, type Ref } from 'vue'

export function useDraggable(elRef: Ref<HTMLElement | null>, handleSelector = '.tech-panel-header') {
  const style = ref<Partial<{ left: string; top: string; position: 'absolute' }>>({})

  let removeElListener: (() => void) | null = null
  let removeDocListeners: (() => void) | null = null

  const setup = (el: HTMLElement) => {
    let initialized = false
    let isDragging = false
    let startX = 0
    let startY = 0
    let startLeft = 0
    let startTop = 0

    const initPosition = () => {
      if (initialized) return
      // Use offsetLeft/Top so values are relative to the positioned parent,
      // avoiding double-counting the header/status bars.
      style.value.left = `${el.offsetLeft}px`
      style.value.top = `${el.offsetTop}px`
      style.value.position = 'absolute'
      initialized = true
    }

    const clampToParent = (left: number, top: number) => {
      const parent = el.offsetParent as HTMLElement | null
      if (!parent) return { left, top }
      const pw = parent.clientWidth
      const ph = parent.clientHeight
      const rect = el.getBoundingClientRect()
      return {
        left: Math.max(0, Math.min(left, pw - rect.width)),
        top: Math.max(0, Math.min(top, ph - rect.height)),
      }
    }

    const onMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const nextLeft = startLeft + dx
      const nextTop = startTop + dy
      const clamped = clampToParent(nextLeft, nextTop)
      style.value.left = `${clamped.left}px`
      style.value.top = `${clamped.top}px`
    }

    const onUp = () => {
      isDragging = false
      if (removeDocListeners) {
        removeDocListeners()
        removeDocListeners = null
      }
    }

    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Only start dragging when the user interacts with the header area.
      const handle = target.closest(handleSelector)
      if (!handle || !el.contains(handle as Node)) return

      if (target.closest('button, .close-btn, .clear-btn, .toggle-btn, input, select, .color-picker, .color-swatch, .panel-resize-handle')) {
        return
      }
      initPosition()
      isDragging = true
      startX = e.clientX
      startY = e.clientY
      startLeft = parseFloat(style.value.left || '0')
      startTop = parseFloat(style.value.top || '0')

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      removeDocListeners = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
    }

    el.addEventListener('mousedown', onDown)
    removeElListener = () => {
      el.removeEventListener('mousedown', onDown)
    }
  }

  watch(
    () => elRef.value,
    (el) => {
      if (removeElListener) {
        removeElListener()
        removeElListener = null
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
    if (removeElListener) removeElListener()
    if (removeDocListeners) removeDocListeners()
  })

  return { style }
}
