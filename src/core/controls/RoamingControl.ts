import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import type { RoamingSpeed } from '@/types'
import { ROAMING_SPEEDS } from '@/utils/constants'

export class RoamingControl {
  controls: PointerLockControls
  private moveState = { forward: false, backward: false, left: false, right: false }
  private velocity = new THREE.Vector3()
  private direction = new THREE.Vector3()
  private speedLevel: RoamingSpeed = 'normal'
  private isActive = false

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.controls = new PointerLockControls(camera, domElement)

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.isActive) return
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveState.forward = true
        break
      case 'KeyS':
      case 'ArrowDown':
        this.moveState.backward = true
        break
      case 'KeyA':
      case 'ArrowLeft':
        this.moveState.left = true
        break
      case 'KeyD':
      case 'ArrowRight':
        this.moveState.right = true
        break
    }
  }

  private onKeyUp = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveState.forward = false
        break
      case 'KeyS':
      case 'ArrowDown':
        this.moveState.backward = false
        break
      case 'KeyA':
      case 'ArrowLeft':
        this.moveState.left = false
        break
      case 'KeyD':
      case 'ArrowRight':
        this.moveState.right = false
        break
    }
  }

  start(): void {
    this.controls.lock()
    this.isActive = true
  }

  stop(): void {
    this.controls.unlock()
    this.isActive = false
    this.moveState = { forward: false, backward: false, left: false, right: false }
    this.velocity.set(0, 0, 0)
  }

  setSpeed(level: RoamingSpeed): void {
    this.speedLevel = level
  }

  update(delta: number): void {
    if (!this.isActive) return

    const speed = ROAMING_SPEEDS[this.speedLevel]
    const decay = 10.0

    this.velocity.x -= this.velocity.x * decay * delta
    this.velocity.z -= this.velocity.z * decay * delta

    this.direction.z = Number(this.moveState.forward) - Number(this.moveState.backward)
    this.direction.x = Number(this.moveState.right) - Number(this.moveState.left)
    this.direction.normalize()

    if (this.moveState.forward || this.moveState.backward) {
      this.velocity.z -= this.direction.z * speed * delta * 10
    }
    if (this.moveState.left || this.moveState.right) {
      this.velocity.x -= this.direction.x * speed * delta * 10
    }

    this.controls.moveRight(-this.velocity.x * delta)
    this.controls.moveForward(-this.velocity.z * delta)
  }

  isLocked(): boolean {
    return this.controls.isLocked
  }

  dispose(): void {
    this.stop()
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.controls.dispose()
  }
}
