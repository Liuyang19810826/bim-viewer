import * as THREE from 'three'
import type { BIMViewer } from '../BIMViewer'

export interface ViewCubeEvent {
  type: 'face' | 'edge' | 'vertex'
  direction: THREE.Vector3
}

export class ViewCubeManager {
  container: HTMLElement
  scene: THREE.Scene
  camera: THREE.OrthographicCamera
  renderer: THREE.WebGLRenderer
  cubeGroup: THREE.Group
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private isDragging = false
  private lastPointer = new THREE.Vector2()
  private pendingHit: THREE.Intersection | null = null
  private viewer: BIMViewer
  private onInteract?: (event: ViewCubeEvent) => void
  private onDrag?: (deltaX: number, deltaY: number) => void
  private rafId = 0

  constructor(container: HTMLElement, viewer: BIMViewer) {
    this.container = container
    this.viewer = viewer

    const rect = container.getBoundingClientRect()
    this.scene = new THREE.Scene()
    this.scene.background = null

    const size = 4
    this.camera = new THREE.OrthographicCamera(-size, size, size, -size, 0.1, 100)
    this.camera.position.set(5, 5, 5)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(rect.width, rect.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)

    this.cubeGroup = new THREE.Group()
    this.scene.add(this.cubeGroup)

    this.buildCube()
    this.addLights()
    this.bindEvents()
    this.startRenderLoop()
  }

  private buildCube(): void {
    const boxSize = 1.6
    const half = boxSize / 2

    const faces = [
      { normal: new THREE.Vector3(0, 0, 1), label: '前' },
      { normal: new THREE.Vector3(0, 0, -1), label: '后' },
      { normal: new THREE.Vector3(1, 0, 0), label: '右' },
      { normal: new THREE.Vector3(-1, 0, 0), label: '左' },
      { normal: new THREE.Vector3(0, 1, 0), label: '上' },
      { normal: new THREE.Vector3(0, -1, 0), label: '下' },
    ]

    const boxGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize)
    const materials: THREE.MeshStandardMaterial[] = []

    for (let i = 0; i < 6; i++) {
      const face = faces[i]
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const ctx = canvas.getContext('2d')!

      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(0, 0, 256, 256)
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 8
      ctx.strokeRect(8, 8, 240, 240)
      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 96px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(face.label, 128, 128)

      const texture = new THREE.CanvasTexture(canvas)
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        side: THREE.FrontSide,
      })
      mat.userData = { type: 'face', normal: face.normal }
      materials.push(mat)
    }

    const cube = new THREE.Mesh(boxGeo, materials)
    cube.userData = { isCube: true }
    this.cubeGroup.add(cube)

    // Outer ring
    const ringGeo = new THREE.TorusGeometry(1.45, 0.015, 16, 100)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    this.cubeGroup.add(ring)

    // Direction labels on ring
    const ringLabels = [
      { text: '前', pos: new THREE.Vector3(0, 0, 1.6) },
      { text: '后', pos: new THREE.Vector3(0, 0, -1.6) },
      { text: '右', pos: new THREE.Vector3(1.6, 0, 0) },
      { text: '左', pos: new THREE.Vector3(-1.6, 0, 0) },
    ]
    ringLabels.forEach((l) => {
      const sprite = this.createLabel(l.text, '#334155', l.pos)
      this.cubeGroup.add(sprite)
    })
  }

  private createLabel(text: string, color: string, position: THREE.Vector3): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.font = 'bold 64px sans-serif'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 64, 64)
    const texture = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(mat)
    sprite.position.copy(position)
    sprite.scale.set(0.45, 0.45, 0.45)
    return sprite
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)
    const directional = new THREE.DirectionalLight(0xffffff, 0.8)
    directional.position.set(5, 10, 7)
    this.scene.add(directional)
  }

  private bindEvents(): void {
    this.container.addEventListener('pointerdown', this.onPointerDown)
    this.container.addEventListener('pointermove', this.onPointerMove)
    this.container.addEventListener('pointerup', this.onPointerUp)
    this.container.addEventListener('pointerleave', this.onPointerUp)
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    this.isDragging = false
    this.pendingHit = null
    this.lastPointer.set(event.clientX, event.clientY)

    const hit = this.raycast(event.clientX, event.clientY)
    if (hit && hit.object.userData.type) {
      this.pendingHit = hit
    }
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (this.lastPointer.lengthSq() === 0) return
    const dx = event.clientX - this.lastPointer.x
    const dy = event.clientY - this.lastPointer.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      this.isDragging = true
      this.pendingHit = null
    }
    if (this.isDragging) {
      this.onDrag?.(dx * 0.01, dy * 0.01)
    }
    this.lastPointer.set(event.clientX, event.clientY)
  }

  private onPointerUp = (): void => {
    if (!this.isDragging && this.pendingHit) {
      const localNormal = this.pendingHit.object.userData.normal as THREE.Vector3
      const worldNormal = localNormal.clone().applyQuaternion(this.cubeGroup.quaternion)
      this.onInteract?.({
        type: this.pendingHit.object.userData.type,
        direction: worldNormal,
      })
    }
    this.isDragging = false
    this.pendingHit = null
    this.lastPointer.set(0, 0)
  }

  private raycast(clientX: number, clientY: number): THREE.Intersection | null {
    const rect = this.container.getBoundingClientRect()
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const intersects = this.raycaster.intersectObjects(this.cubeGroup.children, true)
    return intersects.length > 0 ? intersects[0] : null
  }

  syncOrientation(direction: THREE.Vector3): void {
    const normalized = direction.clone().normalize()
    this.cubeGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalized)
  }

  setCallbacks(
    onInteract: (event: ViewCubeEvent) => void,
    onDrag: (deltaX: number, deltaY: number) => void
  ): void {
    this.onInteract = onInteract
    this.onDrag = onDrag
  }

  private startRenderLoop(): void {
    const animate = () => {
      if (!this.container.isConnected) return
      this.rafId = requestAnimationFrame(animate)
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height)
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId)
    this.container.removeEventListener('pointerdown', this.onPointerDown)
    this.container.removeEventListener('pointermove', this.onPointerMove)
    this.container.removeEventListener('pointerup', this.onPointerUp)
    this.container.removeEventListener('pointerleave', this.onPointerUp)
    this.renderer.dispose()
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
