import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { validateGLTFBinFiles } from '@/utils/fileUtils'
import type { LoadProgress, ModelInfo } from '@/types'

export interface FolderLoadResult {
  scene: THREE.Group
  info: ModelInfo
}

export class FolderGLTFLoader {
  async load(
    files: File[],
    onProgress?: (progress: LoadProgress) => void
  ): Promise<FolderLoadResult> {
    const validation = validateGLTFBinFiles(files)
    if (!validation.valid || !validation.gltfFile) {
      throw new Error(validation.message || '文件校验失败')
    }

    const fileMap = new Map<string, string>()
    files.forEach((file) => {
      fileMap.set(file.name, URL.createObjectURL(file))
    })

    const manager = new THREE.LoadingManager()
    manager.setURLModifier((url) => {
      const fileName = url.split('/').pop() || url
      return fileMap.get(fileName) || url
    })

    const loader = new GLTFLoader(manager)

    return new Promise((resolve, reject) => {
      const gltfUrl = URL.createObjectURL(validation.gltfFile!)

      loader.load(
        gltfUrl,
        (gltf: { scene: THREE.Group }) => {
          URL.revokeObjectURL(gltfUrl)

          const scene = gltf.scene

          let vertexCount = 0
          let triangleCount = 0
          let componentCount = 0

          scene.traverse((obj: THREE.Object3D) => {
            const mesh = obj as THREE.Mesh
            if (mesh.isMesh) {
              componentCount++
              const geometry = mesh.geometry
              if (geometry.index) {
                triangleCount += geometry.index.count / 3
              } else {
                triangleCount += geometry.attributes.position.count / 3
              }
              vertexCount += geometry.attributes.position.count
            }
          })

          resolve({
            scene,
            info: {
              name: validation.gltfFile!.name,
              componentCount,
              vertexCount,
              triangleCount: Math.floor(triangleCount),
            },
          })
        },
        (event: ProgressEvent<EventTarget>) => {
          if (event.lengthComputable && onProgress) {
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            })
          }
        },
        (error: unknown) => {
          URL.revokeObjectURL(gltfUrl)
          const msg = error instanceof Error ? error.message : '未知错误'
          reject(new Error(`模型解析失败：${msg}`))
        }
      )
    })
  }
}
