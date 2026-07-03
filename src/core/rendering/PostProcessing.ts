import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js'
import type { RenderSettings } from '@/types'

const ColorCorrectionShader = {
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 1.0 },
    contrast: { value: 1.0 },
    saturation: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;

      color = color * brightness;
      color = (color - 0.5) * contrast + 0.5;

      float luminance = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(luminance), color, saturation);

      gl_FragColor = vec4(color, texel.a);
    }
  `,
}

export class PostProcessing {
  composer: EffectComposer
  ssaoPass?: SSAOPass
  fxaaPass?: ShaderPass
  bloomPass?: UnrealBloomPass
  colorPass: ShaderPass
  outputPass: OutputPass
  renderPass: RenderPass

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number,
    settings: RenderSettings
  ) {
    this.composer = new EffectComposer(renderer)
    this.renderPass = new RenderPass(scene, camera)
    this.composer.addPass(this.renderPass)

    this.ssaoPass = new SSAOPass(scene, camera, width, height)
    this.ssaoPass.kernelRadius = settings.ssaoRadius
    this.ssaoPass.minDistance = 0.005
    this.ssaoPass.maxDistance = 0.1
    this.composer.addPass(this.ssaoPass)

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      settings.bloomStrength,
      settings.bloomRadius,
      settings.bloomThreshold
    )
    this.composer.addPass(this.bloomPass)

    this.colorPass = new ShaderPass(ColorCorrectionShader)
    this.composer.addPass(this.colorPass)

    this.fxaaPass = new ShaderPass(FXAAShader)
    this.fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height)
    this.composer.addPass(this.fxaaPass)

    this.outputPass = new OutputPass()
    this.composer.addPass(this.outputPass)

    this.applySettings(settings)
  }

  applySettings(settings: RenderSettings): void {
    if (this.ssaoPass) {
      this.ssaoPass.enabled = settings.ssaoEnabled
      this.ssaoPass.kernelRadius = settings.ssaoRadius
    }
    if (this.bloomPass) {
      this.bloomPass.enabled = settings.bloomEnabled
      this.bloomPass.strength = settings.bloomStrength
      this.bloomPass.radius = settings.bloomRadius
      this.bloomPass.threshold = settings.bloomThreshold
    }
    if (this.fxaaPass) {
      this.fxaaPass.enabled = settings.fxaaEnabled
    }
    if (this.colorPass) {
      this.colorPass.uniforms.brightness.value = settings.brightness
      this.colorPass.uniforms.contrast.value = settings.contrast
      this.colorPass.uniforms.saturation.value = settings.saturation
    }
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height)
    if (this.fxaaPass) {
      this.fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height)
    }
  }

  render(): void {
    this.composer.render()
  }

  dispose(): void {
    this.composer.dispose()
    this.ssaoPass?.dispose()
    this.bloomPass?.dispose()
  }
}
