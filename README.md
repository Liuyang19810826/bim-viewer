# BIM 轻量化模型展示系统

基于 Three.js + Vue 3 + Pinia 的网页端 BIM 轻量化模型查看工具，支持 GLTF/BIN 格式模型加载、3D 交互、构件属性查询、实时剖切、第一人称漫游、高级渲染特效及对外 API 服务。

## 功能特性

- **本地模型加载**：选择文件夹自动识别 `.gltf` + `.bin` 配套文件
- **基础 3D 交互**：平移、缩放、旋转、阻尼效果、视角重置
- **构件属性查询**：鼠标拾取构件，右侧属性面板展示详细信息
- **实时剖切**：X/Y/Z 三轴剖切，拖拽调整剖切面位置
- **第一人称漫游**：WASD 移动 + 鼠标视角，支持速度调节
- **高级渲染**：PBR 材质、HDR 环境、SSAO、FXAA、Bloom、ACES 色调映射
- **系统设置**：渲染参数、界面参数实时调节并本地持久化
- **操作日志**：自动记录用户核心操作，支持清空
- **对外 API**：提供 JS SDK 与 iframe postMessage 集成能力

## 技术栈

- Vue 3.5 + TypeScript 5
- Vite 8
- Pinia 3
- Three.js r185
- @vueuse/core

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 使用说明

1. 点击顶部【加载模型】按钮，选择包含 `.gltf` 与 `.bin` 文件的本地文件夹
2. 模型加载完成后，可使用鼠标拖拽、滚轮、右键进行查看
3. 点击模型构件可查看属性信息
4. 点击【开启剖切】进入剖切模式，使用底部控制面板调整剖切面
5. 点击【开启漫游】进入第一人称漫游，按 WASD 移动，鼠标控制视角，ESC 退出
6. 点击【设置】可调整渲染参数、界面参数，修改即时生效并自动保存

## 测试模型

项目包含 `test-model/cube.gltf` 与 `test-model/cube.bin` 测试模型，可用于快速验证功能。

## 对外 API

系统启动后自动暴露 `window.BIMViewerSDK`（iframe 模式下通过 `postMessage` 调用）。

主要能力：

- `loadModel(files)` 加载模型
- `resetView()` / `resetScene()` / `clearModel()` 场景控制
- `setMode(mode)` 切换查看/剖切/漫游模式
- `setClipAxis(axis)` / `setClipOffset(value)` 剖切控制
- `setRoamingSpeed(speed)` 漫游速度
- `selectComponentById(id)` 按 ID 查询构件
- `applyRenderSettings(settings)` 渲染参数
- `getSceneStatus()` 场景状态

返回格式统一为：

```json
{
  "code": 200,
  "message": "成功",
  "data": {},
  "timestamp": 1234567890
}
```

## 项目结构

```
src/
  components/   # UI 组件
  composables/  # Vue 组合式函数
  core/         # Three.js 渲染引擎核心
  stores/       # Pinia 状态管理
  api/          # 对外 SDK / iframe 桥接
  utils/        # 工具函数
  types/        # TypeScript 类型
```

## 注意事项

- 仅支持桌面端现代浏览器（Chrome / Edge / Firefox）
- 首次加载大模型时请耐心等待，加载进度会显示在画面中
- 低配设备可在设置中关闭后处理特效以提升帧率
