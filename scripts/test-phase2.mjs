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
    page.setViewport({ width: 1280, height: 720 })

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

    await clickButton('材质')
    await clickButton('光照')
    await clickButton('后处理')

    const materialPanel = await page.$('.material-panel')
    const lightingPanel = await page.$('.lighting-panel')
    const postProcessingPanel = await page.$('.post-processing-panel')
    console.log('Material panel visible:', !!materialPanel)
    console.log('Lighting panel visible:', !!lightingPanel)
    console.log('Post processing panel visible:', !!postProcessingPanel)

    // select first material
    const materialSelect = await page.$('.material-panel select')
    if (materialSelect) {
      const options = await materialSelect.$$('option')
      if (options.length > 1) {
        await materialSelect.select(await options[1].evaluate((el) => el.value))
        await new Promise((r) => setTimeout(r, 300))
      }
    }

    // change metalness via the first slider in material panel
    const materialSlider = await page.$('.material-panel .tech-slider input')
    if (materialSlider) {
      await materialSlider.evaluate((el) => { el.value = '0.8'; el.dispatchEvent(new Event('input', { bubbles: true })) })
      await new Promise((r) => setTimeout(r, 300))
    }

    // toggle a post-processing switch (first .tech-toggle-switch)
    const ppToggle = await page.$('.post-processing-panel .tech-toggle-switch')
    if (ppToggle) {
      await ppToggle.click()
      await new Promise((r) => setTimeout(r, 300))
    }

    await page.screenshot({ path: path.join(__dirname, '..', 'phase2-test-screenshot.png') })
    console.log('Screenshot saved to phase2-test-screenshot.png')
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
