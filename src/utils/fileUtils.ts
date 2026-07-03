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
  const binFiles = files.filter((f) => f.name.toLowerCase().endsWith('.bin'))

  if (gltfFiles.length === 0) {
    return { valid: false, binFiles, message: '未找到 .gltf 文件' }
  }

  if (gltfFiles.length > 1) {
    return { valid: false, binFiles, message: '当前版本仅支持单个 GLTF 模型加载' }
  }

  const gltfFile = gltfFiles[0]
  const gltfName = gltfFile.name.replace(/\.gltf$/i, '')
  const hasMatchingBin = binFiles.some((f) => {
    const binName = f.name.replace(/\.bin$/i, '')
    return binName === gltfName || binName.startsWith(gltfName)
  })

  if (!hasMatchingBin) {
    return { valid: false, binFiles, message: '模型文件不完整，请检查 gltf/bin 配套文件' }
  }

  return { valid: true, gltfFile, binFiles }
}

export function fileListToFiles(fileList: FileList | null): File[] {
  if (!fileList) return []
  return Array.from(fileList)
}
