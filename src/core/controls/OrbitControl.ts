import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export class OrbitControl {
  controls: OrbitControls
  private enabled = true

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.controls = new OrbitControls(camera, domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 1
    this.controls.maxDistance = 1000
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.controls.enabled = enabled
  }

  isEnabled(): boolean {
    return this.enabled
  }

  update(): void {
    if (this.enabled) {
      this.controls.update()
    }
  }

  reset(): void {
    this.controls.reset()
  }

  saveState(): void {
    this.controls.saveState()
  }

  dispose(): void {
    this.controls.dispose()
  }
}
