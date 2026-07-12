import * as THREE from 'three'
import type { BIMViewer } from '../BIMViewer'

export class RegionZoomManager {
  private viewer: BIMViewer
  private domElement: HTMLElement
  private overlay: HTMLElement | null = null
  private startPoint = new THREE.Vector2()
  private isDragging = false
  private wasOrbitEnabled = true

  constructor(viewer: BIMViewer) {
    this.viewer = viewer
    this.domElement = viewer.renderer.domElement
    this.bindEvents()
  }

  private bindEvents(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown)
    this.domElement.addEventListener('pointermove', this.onPointerMove)
    this.domElement.addEventListener('pointerup', this.onPointerUp)
    this.domElement.addEventListener('pointerleave', this.onPointerUp)
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.domElement.removeEventListener('pointermove', this.onPointerMove)
    this.domElement.removeEventListener('pointerup', this.onPointerUp)
    this.domElement.removeEventListener('pointerleave', this.onPointerUp)
    this.removeOverlay()
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    this.isDragging = false
    this.startPoint.set(event.clientX, event.clientY)
    this.createOverlay(event.clientX, event.clientY)
    this.wasOrbitEnabled = this.viewer.orbit.isEnabled()
    this.viewer.orbit.setEnabled(false)
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.overlay) return
    const dx = event.clientX - this.startPoint.x
    const dy = event.clientY - this.startPoint.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      this.isDragging = true
    }
    const rect = this.getRect(event.clientX, event.clientY)
    this.overlay.style.left = `${rect.x}px`
    this.overlay.style.top = `${rect.y}px`
    this.overlay.style.width = `${rect.width}px`
    this.overlay.style.height = `${rect.height}px`
  }

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.overlay) return
    const endPoint = new THREE.Vector2(event.clientX, event.clientY)
    const rect = this.getRect(endPoint.x, endPoint.y)
    this.removeOverlay()
    this.viewer.orbit.setEnabled(this.wasOrbitEnabled)

    if (!this.isDragging || rect.width < 4 || rect.height < 4) {
      return
    }

    this.zoomToRegion(rect)
  }

  private getRect(endX: number, endY: number) {
    const x = Math.min(this.startPoint.x, endX)
    const y = Math.min(this.startPoint.y, endY)
    const width = Math.abs(endX - this.startPoint.x)
    const height = Math.abs(endY - this.startPoint.y)
    return { x, y, width, height }
  }

  private createOverlay(x: number, y: number): void {
    const overlay = document.createElement('div')
    overlay.style.position = 'fixed'
    overlay.style.left = `${x}px`
    overlay.style.top = `${y}px`
    overlay.style.width = '0px'
    overlay.style.height = '0px'
    overlay.style.border = '1px dashed var(--accent-cyan, #00d4ff)'
    overlay.style.background = 'rgba(0, 212, 255, 0.12)'
    overlay.style.pointerEvents = 'none'
    overlay.style.zIndex = '200'
    document.body.appendChild(overlay)
    this.overlay = overlay
  }

  private removeOverlay(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
    this.overlay = null
  }

  private zoomToRegion(rect: { x: number; y: number; width: number; height: number }): void {
    const model = this.viewer.getCurrentModel()
    if (!model) return

    const canvasRect = this.domElement.getBoundingClientRect()
    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x + rect.width, y: rect.y + rect.height },
      { x: rect.x, y: rect.y + rect.height },
    ]

    const raycaster = new THREE.Raycaster()
    const points: THREE.Vector3[] = []

    corners.forEach((corner) => {
      const ndc = new THREE.Vector2(
        ((corner.x - canvasRect.left) / canvasRect.width) * 2 - 1,
        -((corner.y - canvasRect.top) / canvasRect.height) * 2 + 1
      )
      raycaster.setFromCamera(ndc, this.viewer.camera)
      const intersects = raycaster.intersectObject(model, true)
      if (intersects.length > 0) {
        points.push(intersects[0].point)
      }
    })

    // Fallback: intersect with horizontal plane at model center height if no corners hit
    if (points.length === 0) {
      const modelBox = new THREE.Box3().setFromObject(model)
      const planeY = modelBox.getCenter(new THREE.Vector3()).y
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY)
      const target = new THREE.Vector3()

      corners.forEach((corner) => {
        const ndc = new THREE.Vector2(
          ((corner.x - canvasRect.left) / canvasRect.width) * 2 - 1,
          -((corner.y - canvasRect.top) / canvasRect.height) * 2 + 1
        )
        raycaster.setFromCamera(ndc, this.viewer.camera)
        if (raycaster.ray.intersectPlane(plane, target)) {
          points.push(target.clone())
        }
      })
    }

    if (points.length === 0) return

    const box = new THREE.Box3()
    points.forEach((p) => box.expandByPoint(p))

    // Include any mesh whose world bounding box center lies inside the screen rect
    // to make the zoom more representative of the selected region.
    const frustum = this.getScreenFrustum(rect, canvasRect)
    if (frustum) {
      model.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (!mesh.isMesh || !mesh.geometry) return
        const meshBox = new THREE.Box3().setFromObject(mesh)
        const meshCenter = meshBox.getCenter(new THREE.Vector3())
        if (frustum.containsPoint(meshCenter)) {
          box.expandByPoint(meshCenter)
        }
      })
    }

    this.viewer.focusOnBox(box)
  }

  private getScreenFrustum(
    rect: { x: number; y: number; width: number; height: number },
    canvasRect: DOMRect
  ): THREE.Frustum | null {
    const camera = this.viewer.camera
    if (!(camera instanceof THREE.PerspectiveCamera)) return null

    const left = ((rect.x - canvasRect.left) / canvasRect.width) * 2 - 1
    const right = ((rect.x + rect.width - canvasRect.left) / canvasRect.width) * 2 - 1
    const top = -((rect.y - canvasRect.top) / canvasRect.height) * 2 + 1
    const bottom = -((rect.y + rect.height - canvasRect.top) / canvasRect.height) * 2 + 1

    const proj = new THREE.Matrix4().makePerspective(
      left * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect,
      right * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect,
      top * Math.tan((camera.fov * Math.PI) / 360),
      bottom * Math.tan((camera.fov * Math.PI) / 360),
      camera.near,
      camera.far
    )
    const view = camera.matrixWorldInverse
    const frustum = new THREE.Frustum()
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(proj, view))
    return frustum
  }
}
