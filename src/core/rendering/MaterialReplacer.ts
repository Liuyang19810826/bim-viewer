import * as THREE from 'three'
import type { RenderSettings } from '@/types'

export class MaterialReplacer {
  static replaceWithStandardMaterial(root: THREE.Object3D, settings: RenderSettings): void {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return

      const original = mesh.material as THREE.Material | THREE.Material[]
      const materials = Array.isArray(original) ? original : [original]

      const newMaterials = materials.map((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (mat.color.equals(new THREE.Color(0xffffff))) {
            mat.color.set(0xaaaaaa)
          }
          this.applySettings(mat, settings)
          return mat
        }

        const originalColor = (mat as THREE.MeshBasicMaterial).color
        const isMeaningfulColor = originalColor && !originalColor.equals(new THREE.Color(0xffffff))
        const newMat = new THREE.MeshStandardMaterial({
          color: isMeaningfulColor ? originalColor : 0xaaaaaa,
          transparent: true,
          side: THREE.DoubleSide,
        })

        if ((mat as THREE.Material).opacity !== undefined) {
          newMat.opacity = (mat as THREE.Material).opacity
        }

        this.applySettings(newMat, settings)
        return newMat
      })

      mesh.material = Array.isArray(original) ? newMaterials : newMaterials[0]
    })
  }

  static applySettings(material: THREE.MeshStandardMaterial, settings: RenderSettings): void {
    material.metalness = settings.metalness
    material.roughness = settings.roughness
    material.opacity = settings.opacity
    material.emissiveIntensity = settings.emissiveIntensity
    material.needsUpdate = true
  }

  static updateMaterials(root: THREE.Object3D, settings: RenderSettings): void {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          this.applySettings(mat, settings)
        }
      })
    })
  }
}
