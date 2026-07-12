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
  const browser = await puppeteer.launch({ executablePath: EDGE_PATH, headless: true, args: ['--disable-gpu', '--no-sandbox'] })
  try {
    const page = await browser.newPage()
    page.setViewport({ width: 1280, height: 720 })
    page.on('console', (msg) => console.log(`[console.${msg.type()}]`, msg.text()))
    page.on('pageerror', (err) => console.error('[pageerror]', err.message))

    const baseUrl = await findDevServer()
    await page.goto(baseUrl, { waitUntil: 'networkidle0' })
    await page.waitForSelector('canvas[data-engine="three.js r185"]')

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
    await new Promise((r) => setTimeout(r, 800))

    async function clickButton(label) {
      const buttons = await page.$$('button.tech-button')
      for (const btn of buttons) {
        const text = await btn.evaluate((el) => el.textContent)
        if (text?.includes(label)) {
          await btn.click()
          await new Promise((r) => setTimeout(r, 500))
          return
        }
      }
      throw new Error(`Button "${label}" not found`)
    }

    await clickButton('校验')
    await clickButton('性能')
    await clickButton('测量')

    console.log('Validation panel visible:', !!(await page.$('.validation-panel')))
    console.log('Performance panel visible:', !!(await page.$('.performance-panel')))
    console.log('Measurement panel visible:', !!(await page.$('.measurement-panel')))

    // GLB has no validation report; test with a gltf for validation
    // Here just check panels open.

    // Start distance measurement
    const measureButtons = await page.$$('.measurement-panel .tech-button')
    for (const btn of measureButtons) {
      const text = await btn.evaluate((el) => el.textContent)
      if (text?.includes('距离')) {
        await btn.click()
        await new Promise((r) => setTimeout(r, 400))
        break
      }
    }

    // click on canvas twice
    const canvas = await page.$('canvas[data-engine="three.js r185"]')
    if (canvas) {
      const box = await canvas.boundingBox()
      if (box) {
        await page.mouse.click(box.x + box.width / 2 - 40, box.y + box.height / 2)
        await new Promise((r) => setTimeout(r, 300))
        await page.mouse.click(box.x + box.width / 2 + 40, box.y + box.height / 2)
        await new Promise((r) => setTimeout(r, 300))
      }
    }

    const pointsCount = await page.evaluate(() => document.querySelectorAll('.measurement-panel .point-row').length)
    const result = await page.evaluate(() => document.querySelector('.measurement-panel .result')?.textContent)
    console.log('Measurement points:', pointsCount)
    console.log('Measurement result:', result)

    await page.screenshot({ path: path.join(__dirname, '..', 'phase3-test-screenshot.png') })
    console.log('Screenshot saved to phase3-test-screenshot.png')
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
