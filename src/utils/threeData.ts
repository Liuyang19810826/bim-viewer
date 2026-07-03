import * as THREE from 'three'

export function findUserData(obj: THREE.Object3D): Record<string, unknown> {
  let current: THREE.Object3D | null = obj
  while (current) {
    if (current.userData && Object.keys(current.userData).length > 0) {
      return current.userData
    }
    current = current.parent
  }
  return {}
}
