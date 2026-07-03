import { ref, onMounted, type Ref } from 'vue'

export function useDraggable(elRef: Ref<HTMLElement | null>, handleSelector = '.tech-panel-header') {
  const style = ref<Partial<{ left: string; top: string; position: 'absolute' }>>({})

  onMounted(() => {
    const el = elRef.value
    if (!el) return

    const handle = el.querySelector(handleSelector) as HTMLElement | null
    if (!handle) return

    let initialized = false
    let isDragging = false
    let startX = 0
    let startY = 0
    let startLeft = 0
    let startTop = 0

    const initPosition = () => {
      if (initialized) return
      const rect = el.getBoundingClientRect()
      style.value.left = `${rect.left}px`
      style.value.top = `${rect.top}px`
      style.value.position = 'absolute'
      initialized = true
    }

    const onMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      let nextLeft = startLeft + dx
      let nextTop = startTop + dy

      const vw = window.innerWidth
      const vh = window.innerHeight
      const rect = el.getBoundingClientRect()

      nextLeft = Math.max(0, Math.min(nextLeft, vw - rect.width))
      nextTop = Math.max(0, Math.min(nextTop, vh - rect.height))

      style.value.left = `${nextLeft}px`
      style.value.top = `${nextTop}px`
    }

    const onUp = () => {
      isDragging = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button, .close-btn, .toggle-btn, input, select, .color-picker, .color-swatch')) {
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
    }

    handle.addEventListener('mousedown', onDown)
  })

  return { style }
}
