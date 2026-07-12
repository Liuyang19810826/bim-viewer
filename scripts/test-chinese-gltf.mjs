import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const MODEL_DIR = path.join(__dirname, '..', 'test-model')

async function findDevServer() {
  for (const port of [5173, 5174, 5175, 5176, 5177, 5178]) {
    try {
      const response = await fetch(`http://localhost:${port}/`)
      if (response.ok) return `http://localhost:${port}/`
    } catch {}
  }
  throw new Error('No dev server found')
}

async function main() {
  const binName = 'K03-ST-西出勤楼-提交版_lightweight.bin'
  const gltfName = 'K03-ST-西出勤楼-提交版_lightweight.gltf'

  const originalGltf = fs.readFileSync(path.join(MODEL_DIR, 'cube.gltf'), 'utf-8')
  const renamedGltf = originalGltf.replace(/"uri":\s*"[^"]+\.bin"/, `"uri":"${binName}"`)
  const gltfPath = path.join(MODEL_DIR, gltfName)
  const binPath = path.join(MODEL_DIR, binName)
  fs.writeFileSync(gltfPath, renamedGltf)
  fs.copyFileSync(path.join(MODEL_DIR, 'cube.bin'), binPath)

  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: true, args: ['--disable-gpu', '--no-sandbox'] })
  try {
    const page = await browser.newPage()
    page.setViewport({ width: 1280, height: 720 })
    page.on('console', (msg) => console.log(`[console.${msg.type()}]`, msg.text()))
    page.on('pageerror', (err) => console.error('[pageerror]', err.message))

    const baseUrl = await findDevServer()
    await page.goto(baseUrl, { waitUntil: 'networkidle0' })
    await page.waitForSelector('canvas[data-engine="three.js r185"]')

    const gltfBuffer = fs.readFileSync(gltfPath)
    const binBuffer = fs.readFileSync(binPath)

    await page.evaluateHandle(async (filesData) => {
      const gltfFile = new File([new Uint8Array(filesData.gltf)], filesData.gltfName, { type: 'model/gltf+json' })
      const binFile = new File([new Uint8Array(filesData.bin)], filesData.binName, { type: 'application/octet-stream' })
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(gltfFile)
      dataTransfer.items.add(binFile)
      const input = document.querySelector('input[type="file"][accept=".gltf,.bin"]')
      if (!input) throw new Error('GLTF input not found')
      input.files = dataTransfer.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }, {
      gltf: Array.from(gltfBuffer),
      bin: Array.from(binBuffer),
      gltfName,
      binName,
    })

    await page.waitForFunction(() => {
      const status = document.querySelector('.status-center')
      return status && (status.textContent?.includes('模型加载成功') || status.textContent?.includes('模型加载失败'))
    }, { timeout: 60000 })

    const statusText = await page.evaluate(() => document.querySelector('.status-center')?.textContent)
    console.log('Status:', statusText)

    if (!statusText?.includes('模型加载成功')) {
      throw new Error('Chinese-named GLTF failed to load')
    }

    await page.screenshot({ path: path.join(__dirname, '..', 'chinese-gltf-screenshot.png') })
    console.log('Screenshot saved to chinese-gltf-screenshot.png')
  } finally {
    await browser.close()
    fs.unlinkSync(gltfPath)
    fs.unlinkSync(binPath)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
