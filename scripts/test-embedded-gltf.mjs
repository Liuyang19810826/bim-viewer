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
    } catch {
      // ignore
    }
  }
  throw new Error('No dev server found')
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--disable-gpu', '--no-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 720 })

  page.on('console', (msg) => console.log(`[console.${msg.type()}]`, msg.text()))
  page.on('pageerror', (err) => console.error('[pageerror]', err.message))

  const baseUrl = await findDevServer()
  await page.goto(baseUrl, { waitUntil: 'networkidle0' })
  await page.waitForSelector('canvas[data-engine="three.js r185"]')

  const gltfPath = path.join(MODEL_DIR, 'cube-embedded.gltf')
  const gltfBuffer = fs.readFileSync(gltfPath)

  await page.evaluateHandle(async (filesData) => {
    const gltfFile = new File([new Uint8Array(filesData.gltf)], 'cube-embedded.gltf', { type: 'model/gltf+json' })
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(gltfFile)
    const input = document.querySelector('input[type="file"][accept=".gltf,.bin"]')
    input.files = dataTransfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, { gltf: Array.from(gltfBuffer) })

  await page.waitForFunction(() => {
    const status = document.querySelector('.status-center')
    return status && (status.textContent?.includes('模型加载成功') || status.textContent?.includes('模型加载失败'))
  }, { timeout: 30000 })

  const statusText = await page.evaluate(() => document.querySelector('.status-center')?.textContent)
  console.log('Status:', statusText)

  await page.screenshot({ path: path.join(__dirname, '..', 'embedded-gltf-screenshot.png') })
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
