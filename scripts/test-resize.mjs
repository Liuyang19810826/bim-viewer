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

async function loadModel(page) {
  const glbPath = path.join(MODEL_DIR, 'cube.glb')
  const glbBuffer = fs.readFileSync(glbPath)
  await page.evaluateHandle(async (filesData) => {
    const glbFile = new File([new Uint8Array(filesData.glb)], 'cube.glb', { type: 'model/gltf-binary' })
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(glbFile)
    const input = document.querySelector('input[type="file"][accept=".glb"]')
    if (!input) throw new Error('GLB input not found')
    input.files = dataTransfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, { glb: Array.from(glbBuffer) })

  await page.waitForFunction(() => {
    const status = document.querySelector('.status-center')
    return status && status.textContent?.includes('模型加载成功')
  }, { timeout: 30000 })

  const summaryClose = await page.$('.dialog-header .close-btn')
  if (summaryClose) {
    await summaryClose.click()
    await new Promise((r) => setTimeout(r, 300))
  }
  await new Promise((r) => setTimeout(r, 500))
}

async function clickButton(page, label) {
  const buttons = await page.$$('button.tech-button')
  for (const b of buttons) {
    const text = await b.evaluate((el) => el.textContent)
    if (text?.includes(label)) {
      await b.click()
      await new Promise((r) => setTimeout(r, 500))
      return
    }
  }
}

async function resizePanel(page, selector, dy) {
  const panel = await page.$(selector)
  if (!panel) {
    console.log(selector, 'not found')
    return null
  }
  const before = await panel.boundingBox()
  console.log(selector, 'size before:', before?.width, before?.height)

  const handle = await page.$(`${selector} .panel-resize-handle`)
  if (!handle) {
    console.log(selector, 'resize handle not found')
    return before
  }
  const box = await handle.boundingBox()
  if (box) {
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const topEl = await page.evaluate((x, y) => {
      const el = document.elementFromPoint(x, y)
      return el ? el.className : null
    }, cx, cy)
    console.log(selector, 'elementFromPoint at handle center:', topEl)
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + dy, { steps: 10 })
    await page.mouse.up()
  }
  await new Promise((r) => setTimeout(r, 300))

  const after = await panel.boundingBox()
  console.log(selector, 'size after:', after?.width, after?.height)
  console.log(selector, 'height changed by:', after && before ? Math.round(after.height - before.height) : 0)
  return after
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: true, args: ['--disable-gpu', '--no-sandbox'] })
  const page = await browser.newPage()
  page.setViewport({ width: 1280, height: 720 })
  page.on('console', (msg) => console.log('[console]', msg.text()))
  const baseUrl = await findDevServer()
  await page.goto(baseUrl, { waitUntil: 'networkidle0' })
  await page.waitForSelector('canvas[data-engine="three.js r185"]')

  await loadModel(page)

  await clickButton(page, '光照')
  await resizePanel(page, '.lighting-panel', 200)
  await resizePanel(page, '.lighting-panel', -150)

  await clickButton(page, '后处理')
  await resizePanel(page, '.post-processing-panel', 200)

  await page.screenshot({ path: path.join(__dirname, '..', 'resize-test-screenshot.png') })
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
