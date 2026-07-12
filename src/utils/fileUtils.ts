export interface FolderValidationResult {
  valid: boolean
  gltfFile?: File
  binFiles: File[]
  message?: string
}

export async function readFolderFiles(item: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = []
  const reader = item.createReader()

  const readEntries = (): Promise<File[]> => {
    return new Promise((resolve, reject) => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          resolve(files)
          return
        }
        for (const entry of entries) {
          if (entry.isFile) {
            const file = await new Promise<File>((res, rej) => {
              ;(entry as FileSystemFileEntry).file(res, rej)
            })
            files.push(file)
          } else if (entry.isDirectory) {
            const subFiles = await readFolderFiles(entry as FileSystemDirectoryEntry)
            files.push(...subFiles)
          }
        }
        resolve(await readEntries())
      }, reject)
    })
  }

  return readEntries()
}

export function validateGLTFBinFiles(files: File[]): FolderValidationResult {
  const gltfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.gltf'))
  const glbFiles = files.filter((f) => f.name.toLowerCase().endsWith('.glb'))
  const binFiles = files.filter((f) => f.name.toLowerCase().endsWith('.bin'))

  if (gltfFiles.length === 0 && glbFiles.length === 0) {
    return { valid: false, binFiles, message: '未找到 .gltf 或 .glb 文件' }
  }

  if (gltfFiles.length + glbFiles.length > 1) {
    return { valid: false, binFiles, message: '当前版本仅支持单个模型文件加载' }
  }

  // GLB is self-contained, no bin files required.
  if (glbFiles.length === 1) {
    return { valid: true, gltfFile: glbFiles[0], binFiles }
  }

  const gltfFile = gltfFiles[0]

  // GLTF may use embedded buffers (no external .bin) or external .bin files.
  // Allow any accompanying .bin files; the loader will report missing references if any.
  return { valid: true, gltfFile, binFiles }
}

export function fileListToFiles(fileList: FileList | null): File[] {
  if (!fileList) return []
  return Array.from(fileList)
}
