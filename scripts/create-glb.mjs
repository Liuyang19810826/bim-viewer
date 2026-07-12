import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function writeUint32LE(buffer, offset, value) {
  buffer.writeUInt32LE(value, offset)
}

function align4(n) {
  return (n + 3) & ~3
}

// Cube geometry data
const positions = new Float32Array([
  // front (z=1, normal +Z)
  -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
  // back (z=-1, normal -Z)
  1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1,
  // right (x=1, normal +X)
  1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1,
  // left (x=-1, normal -X)
  -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1,
  // top (y=1, normal +Y)
  -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1,
  // bottom (y=-1, normal -Y)
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

const posBytes = positions.byteLength
const normalBytes = normals.byteLength
const indexBytes = indices.byteLength
const totalBytes = posBytes + normalBytes + indexBytes

const json = JSON.stringify({
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
    { buffer: 0, byteOffset: 0, byteLength: posBytes, target: 34962 },
    { buffer: 0, byteOffset: posBytes, byteLength: normalBytes, target: 34962 },
    { buffer: 0, byteOffset: posBytes + normalBytes, byteLength: indexBytes, target: 34963 },
  ],
  buffers: [{ byteLength: totalBytes }],
})

const jsonBytes = Buffer.from(json)
const jsonChunkLen = align4(jsonBytes.length)
const jsonPadding = jsonChunkLen - jsonBytes.length
const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 0x20)])

const binChunkLen = align4(totalBytes)
const binPadding = binChunkLen - totalBytes
const binData = Buffer.concat([
  Buffer.from(positions.buffer),
  Buffer.from(normals.buffer),
  Buffer.from(indices.buffer),
  Buffer.alloc(binPadding, 0),
])

const totalLength = 12 + 8 + jsonChunk.length + 8 + binData.length
const glb = Buffer.alloc(totalLength)
let offset = 0

// Header
glb.write('glTF', offset)
offset += 4
writeUint32LE(glb, offset, 2)
offset += 4
writeUint32LE(glb, offset, totalLength)
offset += 4

// JSON chunk
writeUint32LE(glb, offset, jsonChunk.length)
offset += 4
writeUint32LE(glb, offset, 0x4e4f534a) // JSON
offset += 4
jsonChunk.copy(glb, offset)
offset += jsonChunk.length

// BIN chunk
writeUint32LE(glb, offset, binData.length)
offset += 4
writeUint32LE(glb, offset, 0x004e4942) // BIN
offset += 4
binData.copy(glb, offset)
offset += binData.length

const outPath = path.join(__dirname, '..', 'test-model', 'cube.glb')
fs.writeFileSync(outPath, glb)
console.log('GLB written to', outPath, `(${glb.length} bytes)`)
