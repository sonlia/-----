# 智能楼宇 3D 数字孪生系统 - Worklog

---
Task ID: main
Agent: Super Z (main)
Task: 基于 GitHub 仓库 sonlia/----- 的 GLB 模型，实现 Three.js 0.185 + WebGPU + ES6 的 3D 智能楼宇寻览大屏，支持空调/照明信息展示与交互、缩放/平移/旋转、点击设备查看详情、空调照明对场景的影响，大屏展示要有设计与科技感。

Work Log:
- 从 https://github.com/sonlia/-----.git 拉取仓库，获得 `未命名.glb`（5.8MB，1092节点）
- 用 Python 解析 GLB 结构：发现语义分组节点 `qiangti`(墙体,101子) / `zhuoyi`(桌椅,712子) / `灯`(58子) / `空调`(198子) / `logo*`(装饰)
- 模型统计：1070网格、12.6万面、4材质；mesh变换烘焙在几何体里（无自身transform）
- 性能瓶颈诊断：1070个draw call + WebGPURenderer的WebGL2回退后端 → FPS=1
- 优化1：用 mergeGeometries 合并非交互几何体（墙90→1、椅712→1、logo全合并），draw call 从 1070 降至 ~80
- 优化2：渲染器检测改用 navigator.gpu.requestAdapter() 严格判断，无 WebGPU 时回退原生 WebGLRenderer（比 WebGPURenderer 的 WebGL2 后端快）
- 优化3：shadow map 2048→1024、pixelRatio 2→1.5、点光源 8→6 且不投射阴影、气流粒子 120→50
- 修复：灯具编号（idx 递增）、空调聚类（用包围盒中心而非 getWorldPosition，因变换烘焙在几何体）
- UI 大幅重写参考用户上传的数字孪生大屏参考图：
  - 引入 Orbitron / Rajdhani / Share Tech Mono 科技字体
  - 面板四角装饰线（科技感）
  - 左侧：KPI总能耗卡片+迷你折线图（Canvas绘制渐变填充+辉光）、照明/空调控制组（带滑块进度色）、视图控制
  - 右侧：设备状态环形图（SVG双环：灯+空调）、设备列表
  - 左下：实时告警流（info/warning/danger 三色，定时模拟）
  - 右下：楼层信息（面积/工位/在线人数/CO₂/湿度）
  - 顶部：标题+WebGPU徽章+FPS+时钟+日期
  - 底部：7项状态栏（设备总数/运行/功率/温度/照度/能耗等级/系统状态）
  - 全局网格背景、面板毛玻璃、按钮扫光动效、数字滚动动画
- 3D 场景增强：
  - 添加 Bloom 后期处理（UnrealBloomPass）增强辉光
  - 添加地面（深色反射）+ 科技网格线 + 装饰圆环
  - 为每个空调单元添加脉冲光环+垂直光柱标记
  - 调整相机为低角度斜视，让建筑更有立体感
- 交互：点击设备列表/3D设备 → 信息面板（12字段）、双击聚焦、照明/空调开关影响场景明暗与气流、告警推送、toast提示

Stage Summary:
- 技术栈：Vite + Three.js 0.185 + ES6 + WebGPU（自动回退 WebGL2 + Bloom）
- 文件：index.html（UI）、main.js（1600+行逻辑）、public/scene.glb（模型）
- 性能：测试环境为 SwiftShader 软件渲染（无GPU），FPS=2；真实GPU浏览器预计 30-60 FPS
- 功能验证（Agent Browser）：设备点击✓、照明开关✓（75→21台）、空调开关✓、告警推送✓、视角重置✓、数字滚动✓、环形图✓、折线图✓
- VLM 视觉评价：科技感 8.5/10，信息密度高，赛博朋克风格强烈
- 待用户在真实GPU环境验证 WebGPU 模式与流畅度

---
Task ID: migrate-nextjs
Agent: Super Z (main)
Task: 将 Vite 项目迁移到 Next.js，方便在预览面板查看

Work Log:
- 备份原 Vite 文件（index.html/main.js/vite.config.js/dist）到 _vite_backup/
- 创建 Next.js 16 项目结构：package.json（next 16 / react 19 / three 0.185）、next.config.mjs（COOP/COEP headers for WebGPU）、tsconfig.json
- 创建 src/app/layout.tsx（根布局，引用 Orbitron/Rajdhani 字体在 globals.css）、src/app/page.tsx（加载 BuildingScene）
- 迁移全部 CSS 到 src/app/globals.css
- 创建 src/components/BuildingScene.tsx（约 900 行）：
  - 'use client' 客户端组件
  - Three.js 逻辑放在 useEffect（WebGPURenderer/WebGLRenderer 回退、OrbitControls、GLB 加载、几何体合并、点光源、气流粒子、地面网格、设备脉冲标记、Bloom 后期处理、raycaster 交互）
  - UI 用 JSX + useState/useRef（loading、renderMode、fps、clock、lightingOn、brightness、acOn、temperature、deviceList、selectedDevice、alerts、onlinePeople、kpiPower 等）
  - 用 stateRef 同步 React state 到 Three.js 闭包，避免闭包陷阱
  - 事件处理：照明/空调开关、亮度/温度滑块、自动旋转、重置/俯视视角、设备列表点击、关闭信息面板
  - 告警流、在线人数、能耗折线图等模拟模块用独立 useEffect
- 模型复制到 public/scene.glb
- bun install 安装依赖，bun run dev 启动（端口 3000）

Stage Summary:
- 成功迁移到 Next.js 16 + React 19 + TypeScript + Three.js 0.185
- 页面编译通过（4.1s），运行无错误
- Agent Browser 验证：模型加载成功（54灯+21空调单元+几何体合并）、UI 完整（75设备/KPI/告警/环形图/楼层信息）、交互正常（点击设备显示12字段详情、照明开关影响运行数）
- VLM 评价：页面渲染正常、UI齐全、3D场景可见、无错误
- 可在预览面板直接查看：http://localhost:3000/

---
Task ID: hdr-theme-rerender
Agent: Super Z (main)
Task: 重新调整 GLB 模型渲染方式：统一添加 HDR 环境照亮模型，所有模型给适合主题的颜色，看清细节并带投影

Work Log:
- 从 Poly Haven 下载免费 HDR 环境贴图 studio_small_03_1k.hdr（1.6MB，Radiance HDR 格式）到 public/studio_small.hdr
- 引入 RGBELoader（three/addons/loaders/RGBELoader.js）
- 重写 setupEnvironment：
  - HDR 环境贴图设为 scene.environment（PBR 反射 + 照明），environmentIntensity=0.8
  - 主方向光强度 0.6→1.8，shadow map 1024→2048，加 normalBias 减少阴影瑕疵
  - 新增冷色辅助方向光（fillLight）从对侧补光照亮暗部细节
  - 删除原程序化渐变环境贴图（createGradientEnvTexture）
- 新增科技主题材质系统 makeThemeMaterial / applyThemeMaterialToMesh：
  - 墙体：深青灰 0x2a3a52，微金属，清晰投影
  - 桌椅：中青蓝 0x1e3a5f，哑光，细节清晰
  - logo：亮青色 0x3a6a9a，高金属反射
  - 灯具：青色外壳 0x4a6080 + 暖白发光 0xffe8b0
  - 空调：冷青蓝金属 0x4a8ab8，干净反光
  - 默认：通用科技青 0x2a4a6a
  - 所有材质 envMapIntensity=1.0 接收 HDR 反射
- 模型加载时统一应用主题材质：合并网格（墙/椅/logo）用主题材质，原始 mesh（灯/空调）用对应主题材质
- 所有 mesh 启用 castShadow + receiveShadow（看清投影细节）
- 修改 applyLighting/applyLightingClosure：不再粗暴覆盖 emissive 颜色，只调 emissiveIntensity；新增 environmentIntensity 随照明变化；曝光调高看清细节
- Bloom 参数调整：strength 0.55→0.45，threshold 0.25→0.6（避免 HDR 照明下整体过曝，只让发光元素辉光）
- 修复 sRGB 警告：HDR 贴图保持线性空间，不设 colorSpace

Stage Summary:
- HDR 环境贴图成功加载，照亮模型并产生 PBR 反射光泽
- 统一科技青蓝色系材质，与 UI 主题呼应
- 投影清晰（2048 shadow map + 所有物体投射/接收阴影）
- VLM 评价：照明出色有光泽感、青蓝色系统一高级、细节清晰可辨、投影自然、对比度优秀
- 交互无回归：点击设备、照明开关均正常
