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
    const boxSize = 1.8
    const half = boxSize / 2

    const faces = [
      { normal: new THREE.Vector3(0, 0, 1), color: 0x3b82f6, label: '前' },
      { normal: new THREE.Vector3(0, 0, -1), color: 0x3b82f6, label: '后' },
      { normal: new THREE.Vector3(1, 0, 0), color: 0xef4444, label: '右' },
      { normal: new THREE.Vector3(-1, 0, 0), color: 0xef4444, label: '左' },
      { normal: new THREE.Vector3(0, 1, 0), color: 0x10b981, label: '上' },
      { normal: new THREE.Vector3(0, -1, 0), color: 0x10b981, label: '下' },
    ]

    const boxGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize)
    const materials: THREE.MeshStandardMaterial[] = []

    for (let i = 0; i < 6; i++) {
      const face = faces[i]
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext('2d')!
      const hex = '#' + face.color.toString(16).padStart(6, '0')
      ctx.fillStyle = hex
      ctx.fillRect(0, 0, 128, 128)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(0, 0, 128, 128)
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 4
      ctx.strokeRect(4, 4, 120, 120)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 48px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(face.label, 64, 64)

      const texture = new THREE.CanvasTexture(canvas)
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
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

    // Edge markers
    const edgePositions = [
      new THREE.Vector3(half, half, 0),
      new THREE.Vector3(half, -half, 0),
      new THREE.Vector3(-half, half, 0),
      new THREE.Vector3(-half, -half, 0),
      new THREE.Vector3(half, 0, half),
      new THREE.Vector3(half, 0, -half),
      new THREE.Vector3(-half, 0, half),
      new THREE.Vector3(-half, 0, -half),
      new THREE.Vector3(0, half, half),
      new THREE.Vector3(0, half, -half),
      new THREE.Vector3(0, -half, half),
      new THREE.Vector3(0, -half, -half),
    ]
    const edgeNormals = [
      new THREE.Vector3(1, 1, 0).normalize(),
      new THREE.Vector3(1, -1, 0).normalize(),
      new THREE.Vector3(-1, 1, 0).normalize(),
      new THREE.Vector3(-1, -1, 0).normalize(),
      new THREE.Vector3(1, 0, 1).normalize(),
      new THREE.Vector3(1, 0, -1).normalize(),
      new THREE.Vector3(-1, 0, 1).normalize(),
      new THREE.Vector3(-1, 0, -1).normalize(),
      new THREE.Vector3(0, 1, 1).normalize(),
      new THREE.Vector3(0, 1, -1).normalize(),
      new THREE.Vector3(0, -1, 1).normalize(),
      new THREE.Vector3(0, -1, -1).normalize(),
    ]

    const edgeGeo = new THREE.SphereGeometry(0.12, 16, 16)
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x0066ff, emissiveIntensity: 0.5 })
    edgePositions.forEach((pos, i) => {
      const mesh = new THREE.Mesh(edgeGeo, edgeMat.clone())
      mesh.position.copy(pos)
      mesh.userData = { type: 'edge', normal: edgeNormals[i] }
      this.cubeGroup.add(mesh)
    })

    // Vertex markers
    const vertexPositions = [
      new THREE.Vector3(half, half, half),
      new THREE.Vector3(half, half, -half),
      new THREE.Vector3(half, -half, half),
      new THREE.Vector3(half, -half, -half),
      new THREE.Vector3(-half, half, half),
      new THREE.Vector3(-half, half, -half),
      new THREE.Vector3(-half, -half, half),
      new THREE.Vector3(-half, -half, -half),
    ]
    const vertexNormals = vertexPositions.map((v) => v.clone().normalize())

    const vertexGeo = new THREE.SphereGeometry(0.16, 16, 16)
    const vertexMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, emissiveIntensity: 0.5 })
    vertexPositions.forEach((pos, i) => {
      const mesh = new THREE.Mesh(vertexGeo, vertexMat.clone())
      mesh.position.copy(pos)
      mesh.userData = { type: 'vertex', normal: vertexNormals[i] }
      this.cubeGroup.add(mesh)
    })
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
      this.onInteract?.({
        type: this.pendingHit.object.userData.type,
        direction: this.pendingHit.object.userData.normal.clone(),
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
    const target = direction.clone().multiplyScalar(10)
    this.cubeGroup.lookAt(target)
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
