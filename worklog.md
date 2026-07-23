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
