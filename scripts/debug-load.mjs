import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const MODEL_DIR = path.join(__dirname, '..', 'test-model')

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: true, args: ['--disable-gpu', '--no-sandbox'] })
  const page = await browser.newPage()
  page.setViewport({ width: 1280, height: 720 })
  page.on('console', (msg) => console.log(`[console.${msg.type()}]`, msg.text()))
  page.on('pageerror', (err) => console.error('[pageerror]', err.message))

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
  await page.waitForSelector('canvas[data-engine="three.js r185"]')

  const gltf = fs.readFileSync(path.join(MODEL_DIR, 'cube.gltf'))
  const bin = fs.readFileSync(path.join(MODEL_DIR, 'cube.bin'))
  await page.evaluateHandle(async (filesData) => {
    const gltfFile = new File([new Uint8Array(filesData.gltf)], 'cube.gltf', { type: 'model/gltf+json' })
    const binFile = new File([new Uint8Array(filesData.bin)], 'cube.bin', { type: 'application/octet-stream' })
    const dt = new DataTransfer()
    dt.items.add(gltfFile)
    dt.items.add(binFile)
    const input = document.querySelector('input[type=file][multiple]')
    input.files = dt.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, { gltf: Array.from(gltf), bin: Array.from(bin) })

  await new Promise((r) => setTimeout(r, 3000))
  const status = await page.evaluate(() => document.querySelector('.status-center')?.textContent)
  console.log('status:', status)
  const dialogTitle = await page.evaluate(() => document.querySelector('.dialog-header h4')?.textContent)
  console.log('dialog title:', dialogTitle)
  await page.screenshot({ path: path.join(__dirname, '..', 'debug-load.png') })
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
