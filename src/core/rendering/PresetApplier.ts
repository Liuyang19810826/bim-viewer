import * as THREE from 'three'
import type { RenderPreset, RenderSettings } from '@/types'
import { findUserData } from '@/utils/threeData'

const DISCIPLINE_COLORS: Record<string, number> = {
  '土建': 0x808080,
  '结构': 0x3b82f6,
  '给排水': 0x10b981,
  '暖通': 0xf59e0b,
  '电气': 0xef4444,
}

const SYSTEM_COLORS: Record<string, number> = {
  '送风': 0x60a5fa,
  '回风': 0x93c5fd,
  '消防排烟': 0xf87171,
  '冷水': 0x34d399,
  '热水': 0xfbbf24,
  '雨水': 0x818cf8,
  '污水': 0xa78bfa,
  '强电': 0xfca5a5,
  '弱电': 0x86efac,
  '消防电': 0xf87171,
}

const TYPE_HIGHLIGHTS: Record<string, number> = {
  '墙': 0xfacc15,
  '楼板': 0xfacc15,
  '柱': 0xfacc15,
  '梁': 0xfacc15,
  '门': 0xf87171,
  '窗': 0xf87171,
  '管道': 0x60a5fa,
  '风管': 0x34d399,
  '桥架': 0xa78bfa,
}

export class PresetApplier {
  private edgeLines: THREE.LineSegments[] = []
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()

  apply(root: THREE.Object3D, preset: RenderPreset, settings: RenderSettings): void {
    this.clearEdges()

    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return

      if (!this.originalMaterials.has(mesh)) {
        this.originalMaterials.set(mesh, mesh.material)
      }

      const userData = findUserData(mesh)
      const discipline = (userData.discipline as string) || '其他'
      const system = (userData.system as string) || (userData.type as string) || '其他'
      const type = (userData.type as string) || '其他'

      switch (preset) {
        case 'solid':
          this.applySolid(mesh, settings)
          break
        case 'discipline':
          this.applyColor(mesh, DISCIPLINE_COLORS[discipline] || 0x94a3b8, settings, false)
          break
        case 'system':
          this.applyColor(mesh, SYSTEM_COLORS[system] || DISCIPLINE_COLORS[discipline] || 0x94a3b8, settings, false)
          break
        case 'wireframe-solid':
          this.applyWireframeSolid(mesh, settings)
          break
        case 'hidden-wireframe':
          this.applyHiddenWireframe(mesh)
          break
        case 'transparency':
          this.applyTransparency(mesh, discipline, type, settings)
          break
        case 'highlight-type':
          this.applyHighlightType(mesh, type, settings)
          break
        case 'section-cut':
          this.applySectionCut(mesh, discipline, system, settings)
          break
      }
    })
  }

  private applySolid(mesh: THREE.Mesh, settings: RenderSettings): void {
    const original = this.originalMaterials.get(mesh)
    if (original) {
      mesh.material = original
    }
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    mats.forEach((mat) => {
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.transparent = settings.opacity < 1
        mat.opacity = settings.opacity
        mat.metalness = settings.metalness
        mat.roughness = settings.roughness
        mat.needsUpdate = true
      }
    })
  }

  private applyColor(mesh: THREE.Mesh, color: number, settings: RenderSettings, transparent: boolean): void {
    const mat = new THREE.MeshStandardMaterial({
      color,
      transparent: transparent || settings.opacity < 1,
      opacity: settings.opacity,
      metalness: settings.metalness,
      roughness: settings.roughness,
      side: THREE.DoubleSide,
    })
    mesh.material = mat
  }

  private applyWireframeSolid(mesh: THREE.Mesh, settings: RenderSettings): void {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.35,
      metalness: settings.metalness,
      roughness: settings.roughness,
      side: THREE.DoubleSide,
    })
    mesh.material = mat

    const edges = new THREE.EdgesGeometry(mesh.geometry, 30)
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }))
    line.position.copy(mesh.position)
    line.rotation.copy(mesh.rotation)
    line.scale.copy(mesh.scale)
    mesh.parent?.add(line)
    this.edgeLines.push(line)
  }

  private applyHiddenWireframe(mesh: THREE.Mesh): void {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.02,
      side: THREE.DoubleSide,
    })
    mesh.material = mat

    const edges = new THREE.EdgesGeometry(mesh.geometry, 30)
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.8 }))
    line.position.copy(mesh.position)
    line.rotation.copy(mesh.rotation)
    line.scale.copy(mesh.scale)
    mesh.parent?.add(line)
    this.edgeLines.push(line)
  }

  private applyTransparency(mesh: THREE.Mesh, discipline: string, type: string, settings: RenderSettings): void {
    const isMEP = ['给排水', '暖通', '电气'].includes(discipline)
    const isCivil = ['土建', '结构'].includes(discipline)
    const isWallSlab = ['墙', '楼板', '柱', '梁'].includes(type)

    let opacity = settings.opacity
    if (isCivil && isWallSlab) opacity = 0.25
    else if (isMEP) opacity = 1.0
    else opacity = 0.5

    const original = this.originalMaterials.get(mesh)
    if (original) {
      mesh.material = original
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.transparent = opacity < 1
          mat.opacity = opacity
          mat.needsUpdate = true
        }
      })
    } else {
      this.applyColor(mesh, 0xaaaaaa, { ...settings, opacity }, true)
    }
  }

  private applyHighlightType(mesh: THREE.Mesh, type: string, settings: RenderSettings): void {
    const highlightColor = TYPE_HIGHLIGHTS[type] || 0xfacc15
    const isTarget = TYPE_HIGHLIGHTS[type] !== undefined

    if (isTarget) {
      this.applyColor(mesh, highlightColor, settings, false)
    } else {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        transparent: true,
        opacity: 0.25,
        metalness: settings.metalness,
        roughness: settings.roughness,
        side: THREE.DoubleSide,
      })
      mesh.material = mat
    }
  }

  private applySectionCut(mesh: THREE.Mesh, discipline: string, system: string, settings: RenderSettings): void {
    const color = SYSTEM_COLORS[system] || DISCIPLINE_COLORS[discipline] || 0x94a3b8
    this.applyColor(mesh, color, settings, false)
  }

  private clearEdges(): void {
    this.edgeLines.forEach((line) => {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
      line.parent?.remove(line)
    })
    this.edgeLines = []
  }

  reset(root: THREE.Object3D): void {
    this.clearEdges()
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const original = this.originalMaterials.get(mesh)
      if (original) {
        mesh.material = original
      }
    })
    this.originalMaterials.clear()
  }
}
