import * as THREE from 'three'
import type { ComponentData, ComponentProperty } from '@/types'
import { findUserData } from '@/utils/threeData'

export class ComponentPicker {
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private camera: THREE.Camera
  private scene: THREE.Scene
  private highlightedObject: THREE.Object3D | null = null
  private originalMaterial: THREE.Material | THREE.Material[] | null = null
  private highlightMaterial: THREE.MeshStandardMaterial

  constructor(camera: THREE.Camera, scene: THREE.Scene, highlightColor: string) {
    this.camera = camera
    this.scene = scene
    this.highlightMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(highlightColor),
      transparent: true,
      opacity: 0.5,
      depthTest: false,
      side: THREE.DoubleSide,
    })
  }

  setHighlightColor(color: string): void {
    this.highlightMaterial.color.set(color)
  }

  pick(clientX: number, clientY: number, width: number, height: number): ComponentData | null {
    this.pointer.x = (clientX / width) * 2 - 1
    this.pointer.y = -(clientY / height) * 2 + 1

    this.raycaster.setFromCamera(this.pointer, this.camera)
    const intersects = this.raycaster.intersectObjects(this.scene.children, true)

    for (const hit of intersects) {
      const obj = hit.object
      if ((obj as THREE.Mesh).isMesh) {
        this.highlight(obj as THREE.Mesh)
        return this.extractComponentData(obj)
      }
    }

    this.clearHighlight()
    return null
  }

  highlight(mesh: THREE.Mesh): void {
    this.clearHighlight()
    this.highlightedObject = mesh
    this.originalMaterial = mesh.material
    mesh.material = this.highlightMaterial
  }

  clearHighlight(): void {
    if (this.highlightedObject && this.originalMaterial) {
      ;(this.highlightedObject as THREE.Mesh).material = this.originalMaterial
      this.highlightedObject = null
      this.originalMaterial = null
    }
  }

  extractComponentData(object: THREE.Object3D): ComponentData {
    const userData = findUserData(object)
    const name = (userData.name as string) || object.name || '未命名构件'
    const type = (userData.type as string) || '未知类型'
    const id = (userData.id as string) || object.uuid

    const properties: ComponentProperty[] = [
      { key: '构件名称', value: name },
      { key: '构件类型', value: type },
      { key: '构件ID', value: id },
      { key: '专业分类', value: (userData.discipline as string) || '-' },
      { key: '尺寸参数', value: (userData.dimensions as string) || '-' },
      { key: '材质', value: (userData.material as string) || '-' },
      { key: '标高', value: (userData.elevation as string) || '-' },
      { key: '创建时间', value: (userData.createdAt as string) || '-' },
      { key: '备注', value: (userData.remark as string) || '-' },
    ]

    Object.entries(userData).forEach(([key, value]) => {
      if (!properties.some((p) => p.key === key)) {
        properties.push({ key, value: value as string | number | boolean | null })
      }
    })

    return {
      id,
      name,
      type,
      properties,
    }
  }

  dispose(): void {
    this.clearHighlight()
    this.highlightMaterial.dispose()
  }
}
