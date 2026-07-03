import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

export class EnvironmentBuilder {
  static buildDefaultEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    pmremGenerator.compileEquirectangularShader()
    const environment = new RoomEnvironment()
    const texture = pmremGenerator.fromScene(environment).texture
    environment.dispose()
    pmremGenerator.dispose()
    return texture
  }

  static async loadHDR(url: string, renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
    const loader = new RGBELoader()
    const texture = await loader.loadAsync(url)
    texture.mapping = THREE.EquirectangularReflectionMapping
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    pmremGenerator.compileEquirectangularShader()
    const rt = pmremGenerator.fromEquirectangular(texture)
    texture.dispose()
    pmremGenerator.dispose()
    return rt.texture
  }
}
