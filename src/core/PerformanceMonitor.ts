import * as THREE from 'three'
import type { PerformanceStats } from '@/types'

const HISTORY_SIZE = 60

export class PerformanceMonitor {
  private renderer: THREE.WebGLRenderer
  private frameTimes: number[] = []
  private lastTime = 0
  private lastFrameTime = 0
  private stats: PerformanceStats = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    timestamp: 0,
  }

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer
  }

  beginFrame(): void {
    this.lastTime = performance.now()
  }

  endFrame(): void {
    const now = performance.now()
    const delta = now - this.lastTime
    this.lastFrameTime = delta

    this.frameTimes.push(delta)
    if (this.frameTimes.length > HISTORY_SIZE) {
      this.frameTimes.shift()
    }

    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0

    const renderInfo = this.renderer.info.render
    const memoryInfo = this.renderer.info.memory

    this.stats = {
      fps: Math.round(fps),
      frameTime: Math.round(delta * 100) / 100,
      drawCalls: renderInfo.calls,
      triangles: renderInfo.triangles,
      geometries: memoryInfo.geometries,
      textures: memoryInfo.textures,
      timestamp: now,
    }
  }

  getStats(): PerformanceStats {
    return this.stats
  }

  getFpsHistory(): number[] {
    return this.frameTimes.map((t) => (t > 0 ? 1000 / t : 0))
  }

  reset(): void {
    this.frameTimes = []
    this.lastTime = 0
  }
}
