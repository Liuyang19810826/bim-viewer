import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const MODEL_DIR = path.join(__dirname, '..', 'test-model')

async function findDevServer() {
  const ports = [5173, 5174, 5175, 5176, 5177, 5178]
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/`)
      if (response.ok) {
        console.log(`Found dev server at http://localhost:${port}/`)
        return `http://localhost:${port}/`
      }
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

    // Read test model files
    const gltfPath = path.join(MODEL_DIR, 'cube.gltf')
    const binPath = path.join(MODEL_DIR, 'cube.bin')
    const gltfBuffer = fs.readFileSync(gltfPath)
    const binBuffer = fs.readFileSync(binPath)

    // Create File objects in browser context and dispatch input event
    await page.evaluateHandle(async (filesData) => {
      const gltfFile = new File([new Uint8Array(filesData.gltf)], 'cube.gltf', { type: 'model/gltf+json' })
      const binFile = new File([new Uint8Array(filesData.bin)], 'cube.bin', { type: 'application/octet-stream' })
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(gltfFile)
      dataTransfer.items.add(binFile)

      const input = document.querySelector('input[type="file"][multiple]')
      if (!input) throw new Error('File input not found')
      input.files = dataTransfer.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }, {
      gltf: Array.from(gltfBuffer),
      bin: Array.from(binBuffer),
    })

    // Wait for model to load
    await page.waitForFunction(() => {
      const status = document.querySelector('.status-center')
      return status && status.textContent?.includes('模型加载成功')
    }, { timeout: 30000 })
    console.log('Model loaded successfully')

    // Wait a bit for rendering
    await new Promise((r) => setTimeout(r, 1000))

    // Click on the cube to test picking
    const canvas = await page.$('canvas')
    const box = await canvas.boundingBox()
    const centerX = box.x + box.width / 2
    const centerY = box.y + box.height / 2
    await page.mouse.click(centerX, centerY)
    console.log(`Clicked on canvas at (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`)

    await new Promise((r) => setTimeout(r, 500))

    const propertyPanel = await page.$('.property-panel')
    if (propertyPanel) {
      const title = await page.evaluate((el) => el.querySelector('.component-name')?.textContent, propertyPanel)
      console.log('Property panel shown:', title)
    } else {
      console.log('Property panel not shown (picking may have missed)')
    }

    // Test presets
    async function clickButtonByText(text) {
      const buttons = await page.$$('button')
      for (const btn of buttons) {
        const t = await page.evaluate((el) => el.textContent, btn)
        if (t.includes(text)) {
          await btn.click()
          return true
        }
      }
      return false
    }

    await clickButtonByText('设置')
    await new Promise((r) => setTimeout(r, 500))

    // Switch to render settings tab
    const tabs = await page.$$('.settings-tab')
    for (const tab of tabs) {
      const text = await page.evaluate((el) => el.textContent, tab)
      if (text && text.includes('渲染特效')) {
        await tab.click()
        break
      }
    }
    await new Promise((r) => setTimeout(r, 500))

    const presets = await page.$$('.preset-button')
    if (presets.length > 1) {
      await presets[1].click() // discipline
      await new Promise((r) => setTimeout(r, 800))
      console.log('Switched to discipline preset')
    } else {
      console.log('Preset buttons not found')
    }

    // Close settings
    const closeBtn = await page.$('.settings-header .close-btn')
    if (closeBtn) await closeBtn.click()
    await new Promise((r) => setTimeout(r, 300))

    // Test clipping mode
    const allButtons = await page.$$('button')
    let clipButton = null
    for (const btn of allButtons) {
      const text = await page.evaluate((el) => el.textContent, btn)
      if (text.includes('开启剖切')) {
        clipButton = btn
        break
      }
    }
    if (clipButton) {
      await clipButton.click()
      await new Promise((r) => setTimeout(r, 500))
      const clipPanel = await page.$('.clip-control-panel')
      console.log('Clip control panel visible:', !!clipPanel)

      // Close clipping
      if (clipPanel) {
        const closeButtons = await clipPanel.$$('button')
        for (const btn of closeButtons) {
          const text = await page.evaluate((el) => el.textContent, btn)
          if (text.includes('关闭剖切')) {
            await btn.click()
            await new Promise((r) => setTimeout(r, 300))
            break
          }
        }
      }
    }

    // Take screenshot
    await page.screenshot({ path: path.join(__dirname, '..', 'test-screenshot.png') })
    console.log('Screenshot saved to test-screenshot.png')

  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
