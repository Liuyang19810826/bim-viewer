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
  throw new Error('No dev server found on ports 5173-5178')
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--disable-gpu', '--no-sandbox'],
  })

  try {
    const page = await browser.newPage()
    page.setViewport({ width: 1600, height: 900 })

    page.on('console', (msg) => {
      console.log(`[console.${msg.type()}]`, msg.text())
    })
    page.on('pageerror', (err) => {
      console.error('[pageerror]', err.message)
    })

    const baseUrl = await findDevServer()
    await page.goto(baseUrl, { waitUntil: 'networkidle0' })
    await page.waitForSelector('canvas[data-engine="three.js r185"]')
    console.log('Canvas initialized')

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
      return status && (status.textContent?.includes('模型加载成功') || status.textContent?.includes('模型加载失败'))
    }, { timeout: 30000 })

    const statusText = await page.evaluate(() => document.querySelector('.status-center')?.textContent)
    console.log('Status:', statusText)

    if (!statusText?.includes('模型加载成功')) {
      throw new Error('GLB model failed to load')
    }

    const summaryDialogClose = await page.$('.dialog-header .close-btn')
    if (summaryDialogClose) {
      await summaryDialogClose.click()
      await new Promise((r) => setTimeout(r, 300))
    }
    await new Promise((r) => setTimeout(r, 800))

    async function clickButton(label) {
      const buttons = await page.$$('button.tech-button')
      for (const btn of buttons) {
        const text = await btn.evaluate((el) => el.textContent)
        if (text?.includes(label)) {
          await btn.click()
          await new Promise((r) => setTimeout(r, 400))
          return
        }
      }
      throw new Error(`Button "${label}" not found`)
    }

    // close any floor list panel that may block canvas clicks
    for (let i = 0; i < 3; i++) {
      const floorListClose = await page.$('.floor-list-panel .close-btn')
      if (!floorListClose) break
      await floorListClose.click()
      await new Promise((r) => setTimeout(r, 400))
    }

    await clickButton('人视图')
    const panelVisible = await page.$('.human-eye-panel')
    console.log('Human eye panel visible:', !!panelVisible)

    await clickButton('选取点位')

    // click on the cube front face (avoid the top-center floor-list area)
    const canvas = await page.$('canvas')
    const box = await canvas.boundingBox()
    const clickX = box.x + box.width * 0.5
    const clickY = box.y + box.height * 0.65
    await page.mouse.click(clickX, clickY)
    await new Promise((r) => setTimeout(r, 800))

    const hint = await page.evaluate(() => document.querySelector('.human-eye-panel .hint')?.textContent)
    console.log('Human eye hint:', hint?.trim())

    // switch human-eye render preset to wireframe-solid
    const presetTrigger = await page.$('.human-eye-panel .preset-dropdown .dropdown-trigger')
    if (presetTrigger) {
      await presetTrigger.click()
      await new Promise((r) => setTimeout(r, 200))
      const items = await page.$$('.human-eye-panel .preset-dropdown .dropdown-item')
      for (const item of items) {
        const text = await item.evaluate((el) => el.textContent)
        if (text?.includes('线框实体')) {
          await item.click()
          break
        }
      }
      await new Promise((r) => setTimeout(r, 500))
    }

    const currentPreset = await page.evaluate(() => document.querySelector('.human-eye-panel .preset-dropdown .dropdown-trigger')?.textContent)
    console.log('Human eye preset:', currentPreset?.trim())

    const viewportCanvas = await page.$('.human-eye-panel .viewport-container canvas')
    console.log('Human eye viewport canvas visible:', !!viewportCanvas)

    await page.screenshot({ path: path.join(__dirname, '..', 'human-eye-test-screenshot.png') })
    console.log('Screenshot saved to human-eye-test-screenshot.png')
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
