import * as THREE from 'three'
import type { ClipAxis } from '@/types'

export class ClipManager {
  private scene: THREE.Scene
  private renderer: THREE.WebGLRenderer
  private clipPlane?: THREE.Plane
  private helper?: THREE.PlaneHelper
  private axis: ClipAxis = 'z'
  private enabled = false
  private offset = 0

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene
    this.renderer = renderer
    this.renderer.localClippingEnabled = true
  }

  enable(): void {
    this.enabled = true
    this.createClipPlane()
    this.applyToScene()
  }

  disable(): void {
    this.enabled = false
    this.removeHelper()
    this.clipPlane = undefined
    this.renderer.clippingPlanes = []
  }

  setAxis(axis: ClipAxis): void {
    this.axis = axis
    if (this.enabled) {
      this.createClipPlane()
      this.applyToScene()
    }
  }

  setOffset(value: number): void {
    this.offset = value
    if (this.clipPlane) {
      this.clipPlane.constant = value
    }
    if (this.helper) {
      this.helper.position.set(0, 0, 0)
      this.helper.updateMatrixWorld()
    }
  }

  getAxis(): ClipAxis {
    return this.axis
  }

  getOffset(): number {
    return this.offset
  }

  private createClipPlane(): void {
    this.removeHelper()

    const normal = new THREE.Vector3()
    switch (this.axis) {
      case 'x':
        normal.set(1, 0, 0)
        break
      case 'y':
        normal.set(0, 1, 0)
        break
      case 'z':
        normal.set(0, 0, 1)
        break
    }

    this.clipPlane = new THREE.Plane(normal, this.offset)
    this.helper = new THREE.PlaneHelper(this.clipPlane, 20, 0x00d4ff)
    const mat = this.helper.material as THREE.MeshBasicMaterial
    mat.transparent = true
    mat.opacity = 0.35
    mat.depthWrite = false
    this.scene.add(this.helper)
  }

  private removeHelper(): void {
    if (this.helper) {
      this.scene.remove(this.helper)
      this.helper.geometry.dispose()
      ;(this.helper.material as THREE.Material).dispose()
      this.helper = undefined
    }
  }

  private applyToScene(): void {
    if (this.clipPlane) {
      this.renderer.clippingPlanes = [this.clipPlane]
    }
  }

  dispose(): void {
    this.disable()
  }
}
