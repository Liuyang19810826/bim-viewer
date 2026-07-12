import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const positions = new Float32Array([
  -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
  1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1,
  1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1,
  -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1,
  -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1,
  -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
])

const normals = new Float32Array([
  ...Array(4).fill([0, 0, 1]).flat(),
  ...Array(4).fill([0, 0, -1]).flat(),
  ...Array(4).fill([1, 0, 0]).flat(),
  ...Array(4).fill([-1, 0, 0]).flat(),
  ...Array(4).fill([0, 1, 0]).flat(),
  ...Array(4).fill([0, -1, 0]).flat(),
])

const indices = new Uint16Array([
  0, 1, 2, 0, 2, 3,
  4, 5, 6, 4, 6, 7,
  8, 9, 10, 8, 10, 11,
  12, 13, 14, 12, 14, 15,
  16, 17, 18, 16, 18, 19,
  20, 21, 22, 20, 22, 23,
])

const buffer = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(normals.buffer), Buffer.from(indices.buffer)])
const base64 = buffer.toString('base64')
const uri = `data:application/octet-stream;base64,${base64}`

const posBytes = positions.byteLength
const normalBytes = normals.byteLength
const indexBytes = indices.byteLength

const json = {
  asset: { version: '2.0', generator: 'bim-viewer-test' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: '测试立方体' }],
  meshes: [{
    primitives: [{
      attributes: { POSITION: 0, NORMAL: 1 },
      indices: 2,
      mode: 4,
      extras: { type: '柱', discipline: '结构', floor: '1F' },
    }],
    extras: { type: '柱', discipline: '结构', floor: '1F' },
  }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', max: [1, 1, 1], min: [-1, -1, -1] },
    { bufferView: 1, componentType: 5126, count: 24, type: 'VEC3' },
    { bufferView: 2, componentType: 5123, count: 36, type: 'SCALAR' },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBytes },
    { buffer: 0, byteOffset: posBytes, byteLength: normalBytes },
    { buffer: 0, byteOffset: posBytes + normalBytes, byteLength: indexBytes },
  ],
  buffers: [{ byteLength: buffer.length, uri }],
}

const outPath = path.join(__dirname, '..', 'test-model', 'cube-embedded.gltf')
fs.writeFileSync(outPath, JSON.stringify(json))
console.log('Embedded GLTF written to', outPath)
