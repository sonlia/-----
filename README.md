# 3D 智能楼宇可视化系统

基于 Three.js 0.185.0 的 Web 3D 寻览系统，支持 WebGPU（可选）和大屏展示。

## 功能特性

### 核心功能
- ✅ **Three.js 0.185.0** - 最新版本支持
- ✅ **WebGL2/WebGPU 渲染** - 高性能图形渲染
- ✅ **ES6 模块化** - 现代 JavaScript 语法
- ✅ **大屏展示优化** - 响应式布局适配大屏

### 交互功能
- ✅ **点击选择设备** - 查看设备详细信息
- ✅ **双击聚焦** - 快速定位到设备
- ✅ **缩放/平移/旋转** - OrbitControls 相机控制
- ✅ **自动旋转** - 演示模式自动旋转视角
- ✅ **重置视角** - 一键恢复初始视角

### 设备系统
- ✅ **照明系统**
  - 开关控制
  - 亮度调节滑块
  - 实时照度显示
  - 灯具发光效果
  
- ✅ **空调系统**
  - 开关控制
  - 温度调节（16-30°C）
  - 气流粒子效果
  - 平均温度显示

### UI 界面
- 📊 **顶部标题栏** - 系统名称展示
- 🎛️ **左侧控制面板** - 系统控制按钮和滑块
- 📋 **右侧信息面板** - 设备详细信息展示
- 📈 **底部状态栏** - 设备统计和系统状态

## 技术栈

- **Three.js**: 0.185.0
- **Vite**: 8.1.5 (开发服务器和构建工具)
- **渲染器**: WebGLRenderer (可升级到 WebGPURenderer)
- **控制器**: OrbitControls
- **加载器**: GLTFLoader, RGBELoader

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:5173

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## 模型说明

### GLB 模型要求
- 将您的 GLB 模型文件放置在 `models/` 目录下
- 命名为 `unamed.glb` 或修改 `main.js` 中的路径
- 模型应包含分层结构以便识别不同设备

### 设备命名规范
模型中的网格名称应包含以下关键词以便自动识别：
- **灯具**: `light`, `lamp`, `灯`
- **空调**: `ac`, `air`, `condition`, `空调`
- **椅子**: `chair`, `seat`, `椅`
- **桌子**: `desk`, `table`, `桌`

### HDR 环境贴图
- 默认使用在线 HDR 资源（Poly Haven）
- 如果加载失败会自动创建程序化 HDR 备用方案
- 可将自定义 HDR 放置在 `assets/` 目录

## 文件结构

```
/workspace
├── index.html          # 主页面（UI 布局）
├── main.js            # 主要逻辑（Three.js 场景）
├── package.json       # 项目配置
├── vite.config.js     # Vite 配置
├── models/            # GLB 模型目录
│   └── unamed.glb     # 主模型文件
├── assets/            # 资源文件（HDR 等）
└── public/            # 静态资源
```

## 自定义配置

### 修改设备数据
编辑 `main.js` 中的 `deviceDatabase` 对象：

```javascript
const deviceDatabase = {
    'light': {
        type: '照明设备',
        power: 50,
        status: '运行中',
        // ... 其他属性
    },
    // ...
};
```

### 调整相机初始位置
编辑 `init()` 函数中的相机设置：

```javascript
camera.position.set(20, 15, 20);
```

### 修改主题颜色
编辑 `index.html` 中的 CSS 变量：
- 主色调：`#00d4ff`
- 背景色：`#0a0a1a`

## 性能优化建议

1. **模型优化**: 使用 Draco 压缩 GLB 模型
2. **纹理优化**: 使用适当分辨率的纹理
3. **光照优化**: 减少实时光源数量
4. **后期处理**: 谨慎使用耗时的后期效果

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebGPU 功能需要更新的浏览器版本。

## 许可证

ISC License
