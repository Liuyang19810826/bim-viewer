import type { ValidationReport, ValidationMessage } from '@/types'

interface GLTFJson {
  asset?: { version?: string; generator?: string; [key: string]: unknown }
  scene?: number
  scenes?: unknown[]
  nodes?: Array<{ name?: string; mesh?: number; children?: number[]; skin?: number; [key: string]: unknown }>
  meshes?: Array<{ name?: string; primitives: unknown[]; [key: string]: unknown }>
  materials?: unknown[]
  accessors?: Array<{ bufferView?: number; componentType: number; type: string; count: number; max?: number[]; min?: number[]; [key: string]: unknown }>
  bufferViews?: Array<{ buffer: number; byteOffset?: number; byteLength: number; byteStride?: number; target?: number; [key: string]: unknown }>
  buffers?: Array<{ uri?: string; byteLength?: number; [key: string]: unknown }>
  textures?: unknown[]
  images?: unknown[]
  samplers?: unknown[]
  animations?: unknown[]
  skins?: unknown[]
  [key: string]: unknown
}

const VALID_COMPONENT_TYPES = [5120, 5121, 5122, 5123, 5125, 5126]
const VALID_ACCESSOR_TYPES = ['SCALAR', 'VEC2', 'VEC3', 'VEC4', 'MAT2', 'MAT3', 'MAT4']

function push(messages: ValidationMessage[], type: ValidationMessage['type'], path: string, message: string) {
  messages.push({ type, path, message })
}

function getFileSize(files: File[], name: string): number | undefined {
  const f = files.find((file) => file.name === name)
  return f?.size
}

export async function validateGLTFFile(gltfFile: File, allFiles: File[]): Promise<ValidationReport> {
  const errors: ValidationMessage[] = []
  const warnings: ValidationMessage[] = []
  const infos: ValidationMessage[] = []

  let gltf: GLTFJson
  try {
    const text = await gltfFile.text()
    gltf = JSON.parse(text) as GLTFJson
  } catch {
    return { valid: false, errors: [{ type: 'error', path: '', message: '无法解析 glTF JSON' }], warnings, infos, summary: '解析失败' }
  }

  // asset
  if (!gltf.asset) {
    push(errors, 'error', 'asset', '缺少顶层 asset 对象')
  } else if (!gltf.asset.version) {
    push(warnings, 'warning', 'asset.version', 'asset.version 缺失')
  } else {
    push(infos, 'info', 'asset.version', `glTF 版本：${gltf.asset.version}`)
  }

  // buffers
  const bufferCount = gltf.buffers?.length ?? 0
  if (!gltf.buffers || bufferCount === 0) {
    push(warnings, 'warning', 'buffers', '没有定义 buffers')
  } else {
    gltf.buffers.forEach((buf, i) => {
      if (buf.uri === undefined) {
        push(errors, 'error', `buffers[${i}]`, '外部 glTF 的 buffer 必须包含 uri')
        return
      }
      if (buf.uri.startsWith('data:')) {
        push(infos, 'info', `buffers[${i}].uri`, '使用 Data URI 嵌入式 buffer')
        return
      }
      const size = getFileSize(allFiles, buf.uri)
      if (size === undefined) {
        push(errors, 'error', `buffers[${i}].uri`, `未找到配套文件：${buf.uri}`)
      } else if (buf.byteLength !== undefined && size < buf.byteLength) {
        push(errors, 'error', `buffers[${i}].byteLength`, `buffer 文件体积 ${size} 小于声明的 byteLength ${buf.byteLength}`)
      }
    })
  }

  // bufferViews
  const bufferViewCount = gltf.bufferViews?.length ?? 0
  gltf.bufferViews?.forEach((bv, i) => {
    if (typeof bv.buffer !== 'number' || bv.buffer < 0 || bv.buffer >= bufferCount) {
      push(errors, 'error', `bufferViews[${i}].buffer`, `buffer 索引 ${bv.buffer} 越界`)
    }
    if (!bv.byteLength || bv.byteLength < 0) {
      push(errors, 'error', `bufferViews[${i}].byteLength`, 'byteLength 无效')
    }
    if (bv.byteStride !== undefined && (bv.byteStride < 4 || bv.byteStride > 252 || bv.byteStride % 4 !== 0)) {
      push(warnings, 'warning', `bufferViews[${i}].byteStride`, `byteStride ${bv.byteStride} 不规范`)
    }
  })

  // accessors
  gltf.accessors?.forEach((acc, i) => {
    if (!VALID_COMPONENT_TYPES.includes(acc.componentType)) {
      push(errors, 'error', `accessors[${i}].componentType`, `不支持的 componentType：${acc.componentType}`)
    }
    if (!VALID_ACCESSOR_TYPES.includes(acc.type)) {
      push(errors, 'error', `accessors[${i}].type`, `不支持的 accessor 类型：${acc.type}`)
    }
    if (typeof acc.count !== 'number' || acc.count < 0) {
      push(errors, 'error', `accessors[${i}].count`, 'count 无效')
    }
    if (acc.bufferView !== undefined && (acc.bufferView < 0 || acc.bufferView >= bufferViewCount)) {
      push(errors, 'error', `accessors[${i}].bufferView`, `bufferView 索引 ${acc.bufferView} 越界`)
    }
  })

  // meshes / primitives
  const materialCount = gltf.materials?.length ?? 0
  const accessorCount = gltf.accessors?.length ?? 0
  gltf.meshes?.forEach((mesh, mi) => {
    if (!mesh.primitives || mesh.primitives.length === 0) {
      push(errors, 'error', `meshes[${mi}]`, 'mesh 没有 primitives')
      return
    }
    mesh.primitives.forEach((prim: any, pi: number) => {
      if (!prim.attributes || prim.attributes.POSITION === undefined) {
        push(errors, 'error', `meshes[${mi}].primitives[${pi}].attributes`, 'primitive 缺少 POSITION 属性')
      }
      if (prim.indices !== undefined && (prim.indices < 0 || prim.indices >= accessorCount)) {
        push(errors, 'error', `meshes[${mi}].primitives[${pi}].indices`, `indices accessor 索引 ${prim.indices} 越界`)
      }
      if (prim.material !== undefined && (prim.material < 0 || prim.material >= materialCount)) {
        push(errors, 'error', `meshes[${mi}].primitives[${pi}].material`, `material 索引 ${prim.material} 越界`)
      }
    })
  })

  // nodes
  const meshCount = gltf.meshes?.length ?? 0
  const nodeCount = gltf.nodes?.length ?? 0
  gltf.nodes?.forEach((node, i) => {
    if (node.mesh !== undefined && (node.mesh < 0 || node.mesh >= meshCount)) {
      push(errors, 'error', `nodes[${i}].mesh`, `mesh 索引 ${node.mesh} 越界`)
    }
    node.children?.forEach((child) => {
      if (child < 0 || child >= nodeCount) {
        push(errors, 'error', `nodes[${i}].children`, `子节点索引 ${child} 越界`)
      }
    })
  })

  // scene index
  if (gltf.scene !== undefined && (gltf.scene < 0 || (gltf.scenes && gltf.scene >= gltf.scenes.length))) {
    push(errors, 'error', 'scene', `默认场景索引 ${gltf.scene} 越界`)
  }

  // unused objects (info)
  const usedBufferViews = new Set<number>()
  gltf.accessors?.forEach((acc) => {
    if (acc.bufferView !== undefined) usedBufferViews.add(acc.bufferView)
  })
  gltf.bufferViews?.forEach((_, i) => {
    if (!usedBufferViews.has(i)) push(infos, 'info', `bufferViews[${i}]`, '未使用的 bufferView')
  })

  const usedAccessors = new Set<number>()
  gltf.meshes?.forEach((mesh) => {
    mesh.primitives.forEach((prim: any) => {
      if (prim.indices !== undefined) usedAccessors.add(prim.indices)
      if (prim.attributes) {
        Object.values(prim.attributes).forEach((v) => {
          if (typeof v === 'number') usedAccessors.add(v)
        })
      }
    })
  })
  gltf.accessors?.forEach((_, i) => {
    if (!usedAccessors.has(i)) push(infos, 'info', `accessors[${i}]`, '未使用的 accessor')
  })

  const summary = `校验完成：${errors.length} 个错误、${warnings.length} 个警告、${infos.length} 个提示`
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
    summary,
  }
}
