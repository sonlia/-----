/**
 * 智能楼宇 3D 可视化系统
 * Three.js 0.185.0 + WebGPU + ES6
 *
 * 功能：
 *  - WebGPURenderer（自动回退 WebGL2）
 *  - 加载 GLB 模型，按中文分组名（灯/空调/桌椅/墙体）识别设备
 *  - 照明系统：点光源 + 自发光，亮度可调，开关影响场景明暗
 *  - 空调系统：气流粒子 + 温度色调映射，开关影响场景氛围
 *  - 交互：缩放/平移/旋转、点击设备查看信息、双击聚焦
 *  - 大屏展示：标题栏/控制面板/设备列表/信息面板/状态栏
 */

import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ===== 全局状态 =====
let scene, camera, renderer, controls;
let composer = null; // 后期处理（Bloom 辉光）
let modelRoot = null;
let lightFixtures = [];      // 灯具网格数组
let acUnits = [];            // 空调网格数组
let pointLights = [];        // 点光源数组
let airflowSystems = [];     // 气流粒子系统
let selectableObjects = [];  // 可点击对象
let selectedObject = null;
let hoveredObject = null;
let cameraTween = null;
let clock;
let fpsCounter = { frames: 0, lastTime: 0, value: 0 };

const state = {
    lighting: { enabled: true, brightness: 0.8 },
    ac: { enabled: true, temperature: 24 },
    autoRotate: false,
    showList: true,
    renderMode: 'WebGPU'
};

// 初始相机位置（模型加载后会被重新计算）
const initialCamera = { pos: new THREE.Vector3(30, 22, 30), target: new THREE.Vector3(0, 4, 0) };

// ===== 设备信息数据库 =====
const deviceDB = {
    light: {
        typeName: '照明灯具',
        icon: 'L',
        power: 36,
        voltage: '220V',
        brand: 'Philips',
        model: 'LED Panel Pro',
        lifespan: '50000h',
        colorTemp: '4000K',
        installDate: '2024-01-15',
        lastMaintenance: '2024-06-20',
        status: '运行中'
    },
    ac: {
        typeName: '空调设备',
        icon: 'A',
        power: 1500,
        voltage: '220V',
        brand: 'Daikin',
        model: 'VRV-X RXQ71',
        refrigerant: 'R410A',
        airflow: '1200 m³/h',
        noise: '38 dB',
        installDate: '2023-12-01',
        lastMaintenance: '2024-05-10',
        status: '运行中'
    },
    furniture: {
        typeName: '办公家具',
        icon: 'F',
        material: '环保板材',
        brand: 'Steelcase',
        warranty: '5年',
        installDate: '2024-02-20',
        status: '正常'
    },
    wall: {
        typeName: '建筑结构',
        icon: 'W',
        material: '钢混结构',
        fireRating: 'A级',
        status: '正常'
    },
    default: {
        typeName: '场景对象',
        icon: 'O',
        status: '正常'
    }
};

// ===== 初始化入口 =====
async function init() {
    clock = new THREE.Clock();
    const container = document.getElementById('canvas-container');

    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06081a);
    scene.fog = new THREE.FogExp2(0x06081a, 0.012);

    // 创建相机
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.copy(initialCamera.pos);

    // 创建渲染器：优先 WebGPU，不支持时回退原生 WebGLRenderer（比 WebGPURenderer 的 WebGL2 后端快）
    updateLoaderText('初始化渲染器...');
    let realWebGPU = false;
    if (navigator.gpu && navigator.gpu.requestAdapter) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            realWebGPU = !!adapter;
        } catch (e) {
            realWebGPU = false;
        }
    }
    try {
        if (realWebGPU) {
            renderer = new WebGPURenderer({
                antialias: true,
                alpha: false,
                powerPreference: 'high-performance'
            });
            await renderer.init();
            state.renderMode = 'WebGPU';
        } else {
            throw new Error('WebGPU 适配器不可用');
        }
    } catch (e) {
        console.warn('WebGPU 不可用，使用原生 WebGLRenderer:', e.message);
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        state.renderMode = 'WebGL2';
    }
    document.getElementById('render-mode').textContent = state.renderMode;

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // 后期处理：Bloom 辉光（仅 WebGLRenderer，增强科技感）
    if (state.renderMode !== 'WebGPU') {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloom = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.55, // strength
            0.6,  // radius
            0.25  // threshold
        );
        composer.addPass(bloom);
        composer.addPass(new OutputPass());
    }

    // 轨道控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.screenSpacePanning = true;
    controls.minDistance = 6;
    controls.maxDistance = 120;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controls.target.copy(initialCamera.target);

    // 基础环境光照
    setupEnvironment();

    // 加载模型
    updateLoaderText('加载 3D 模型...');
    await loadModel();

    // 事件绑定
    setupEvents();
    setupUIEvents();

    // 隐藏加载动画
    hideLoader();

    // 初始化新增模块
    initPowerHistory();
    drawPowerChart();
    startAlertSimulation();
    startPeopleSimulation();
    updateDate();
    // 定时推送能耗历史
    setInterval(() => {
        const tp = parseFloat(document.getElementById('kpi-power')?.textContent || '0');
        pushPowerHistory(tp + (Math.random() - 0.5) * 3);
    }, 3000);

    // 暴露调试对象
    window.__three = { renderer, scene, camera, controls, modelRoot, lightFixtures, acUnits };

    // 启动渲染循环
    animate();
}

// ===== 环境与基础光照 =====
function setupEnvironment() {
    // 环境光（会随照明系统动态调整）
    const ambient = new THREE.AmbientLight(0x6688aa, 0.35);
    ambient.name = '__ambient';
    scene.add(ambient);

    // 主方向光（模拟环境入射光，投射阴影）
    const dirLight = new THREE.DirectionalLight(0xb0c4de, 0.6);
    dirLight.position.set(40, 60, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.camera.left = -45;
    dirLight.shadow.camera.right = 45;
    dirLight.shadow.camera.top = 45;
    dirLight.shadow.camera.bottom = -45;
    dirLight.shadow.bias = -0.0005;
    dirLight.name = '__directional';
    scene.add(dirLight);

    // 半球光（天空/地面反射）
    const hemi = new THREE.HemisphereLight(0x88aaff, 0x443322, 0.25);
    hemi.name = '__hemi';
    scene.add(hemi);

    // 程序化环境贴图（用 CubeTexture 方式，兼容 WebGPU/WebGL2）
    scene.environment = createGradientEnvTexture();
}

// 创建渐变环境贴图（用于金属反射，兼容所有后端）
function createGradientEnvTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1a2550');
    grad.addColorStop(0.5, '#0a1030');
    grad.addColorStop(1, '#050818');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// ===== 加载 GLB 模型 =====
function loadModel() {
    return new Promise((resolve) => {
        const loader = new GLTFLoader();
        loader.load(
            '/scene.glb',
            (gltf) => {
                modelRoot = gltf.scene;

                // 归一化模型：居中 + 贴地
                normalizeModel(modelRoot);

                // 识别中文分组名
                const groups = { light: null, ac: null, furniture: null, wall: null, logos: [] };
                modelRoot.traverse((child) => {
                    const n = child.name;
                    if (n === '灯') groups.light = child;
                    else if (n === '空调') groups.ac = child;
                    else if (n === 'zhuoyi' || n === '桌椅') groups.furniture = child;
                    else if (n === 'qiangti' || n === '墙体') groups.wall = child;
                    else if (n && n.startsWith('logo')) groups.logos.push(child);
                });

                scene.add(modelRoot);

                // 性能优化：合并非交互几何体（墙体/桌椅/logo），大幅减少 draw call
                // 墙体合并
                if (groups.wall) {
                    const merged = mergeGroupGeometries(groups.wall, modelRoot);
                    if (merged) {
                        const wallMesh = new THREE.Mesh(merged.geometry, merged.material);
                        wallMesh.name = 'merged_wall';
                        wallMesh.castShadow = true;
                        wallMesh.receiveShadow = true;
                        wallMesh.userData.deviceType = 'wall';
                        wallMesh.userData.deviceInfo = makeDeviceInfo(wallMesh, 'wall', 0);
                        modelRoot.remove(groups.wall);
                        modelRoot.add(wallMesh);
                        selectableObjects.push(wallMesh);
                    } else {
                        identifyWalls(groups.wall);
                    }
                }
                // 桌椅合并（不参与阴影，减少 overdraw）
                if (groups.furniture) {
                    const merged = mergeGroupGeometries(groups.furniture, modelRoot);
                    if (merged) {
                        const furnMesh = new THREE.Mesh(merged.geometry, merged.material);
                        furnMesh.name = 'merged_furniture';
                        furnMesh.castShadow = false;
                        furnMesh.receiveShadow = false;
                        furnMesh.userData.deviceType = 'furniture';
                        furnMesh.userData.deviceInfo = makeDeviceInfo(furnMesh, 'furniture', 0);
                        modelRoot.remove(groups.furniture);
                        modelRoot.add(furnMesh);
                        selectableObjects.push(furnMesh);
                    } else {
                        identifyFurniture(groups.furniture);
                    }
                }
                // logo 合并（装饰，无交互）
                groups.logos.forEach((logoGroup) => {
                    const merged = mergeGroupGeometries(logoGroup, modelRoot);
                    if (merged) {
                        const logoMesh = new THREE.Mesh(merged.geometry, merged.material);
                        logoMesh.name = 'merged_' + logoGroup.name;
                        logoMesh.castShadow = false;
                        logoMesh.receiveShadow = false;
                        modelRoot.remove(logoGroup);
                        modelRoot.add(logoMesh);
                    }
                });

                // 为剩余交互 mesh（灯具/空调）设置材质与阴影
                modelRoot.traverse((child) => {
                    if (child.isMesh && child.geometry) {
                        child.receiveShadow = true;
                        child.castShadow = false;
                        // 补齐 UV 避免警告
                        ensureUV(child.geometry);
                        if (child.material) {
                            child.userData.origEmissive = child.material.emissive
                                ? child.material.emissive.clone()
                                : new THREE.Color(0, 0, 0);
                            child.userData.origEmissiveIntensity = child.material.emissiveIntensity || 0;
                        }
                    }
                });

                // 按分组识别交互设备
                if (groups.light) identifyLightFixtures(groups.light);
                if (groups.ac) identifyACUnits(groups.ac);

                // 设置照明点光源
                setupPointLights();

                // 设置空调气流
                setupAirflow();

                // 添加地面网格与装饰
                setupGround();

                // 添加设备位置脉冲标记
                setupDeviceMarkers();

                // 调整相机适配模型
                fitCameraToModel(modelRoot);

                // 应用初始状态
                applyLighting();
                applyAC();

                // 构建 UI
                buildDeviceList();
                updateStatus();

                console.log(`模型加载完成: ${lightFixtures.length} 个灯具, ${acUnits.length} 个空调`);
                resolve();
            },
            (xhr) => {
                if (xhr.lengthComputable) {
                    const pct = Math.round((xhr.loaded / xhr.total) * 100);
                    updateLoaderText(`加载 3D 模型... ${pct}%`);
                    document.getElementById('loader-bar').style.width = pct + '%';
                }
            },
            (err) => {
                console.error('模型加载失败:', err);
                updateLoaderText('模型加载失败，使用演示场景');
                createDemoScene();
                resolve();
            }
        );
    });
}

// 归一化模型
function normalizeModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    console.log('原始模型包围盒:', `size=${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}`, `center=(${center.x.toFixed(2)},${center.y.toFixed(2)},${center.z.toFixed(2)})`);

    // 归一化到约 40 单位大小
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 40 / maxDim;
    model.scale.setScalar(scale);

    // 重新计算 box 并居中（XZ），贴地（Y=0）
    const box2 = new THREE.Box3().setFromObject(model);
    const center2 = box2.getCenter(new THREE.Vector3());
    model.position.x -= center2.x;
    model.position.z -= center2.z;
    model.position.y -= box2.min.y;

    const box3 = new THREE.Box3().setFromObject(model);
    console.log('归一化后包围盒:', `min=(${box3.min.x.toFixed(2)},${box3.min.y.toFixed(2)},${box3.min.z.toFixed(2)})`, `max=(${box3.max.x.toFixed(2)},${box3.max.y.toFixed(2)},${box3.max.z.toFixed(2)})`);
}

// ===== 几何体合并（大幅减少 draw call） =====
function mergeGroupGeometries(groupNode, root) {
    if (!groupNode) return null;
    root.updateMatrixWorld(true);
    const invRootMatrix = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const geometries = [];
    let refMaterial = null;
    const keep = ['position', 'normal', 'uv'];
    let meshCount = 0;
    groupNode.traverse((child) => {
        if (child.isMesh && child.geometry) {
            meshCount++;
            if (!refMaterial && child.material) refMaterial = child.material;
            const geo = child.geometry.clone();
            // 用相对于 root 的本地矩阵，避免合并后双重变换
            const localMatrix = new THREE.Matrix4().multiplyMatrices(invRootMatrix, child.matrixWorld);
            geo.applyMatrix4(localMatrix);
            // 只保留 position/normal/uv，删除多余属性避免合并失败
            Object.keys(geo.attributes).forEach((k) => {
                if (!keep.includes(k)) geo.deleteAttribute(k);
            });
            ensureUV(geo);
            if (!geo.attributes.normal) geo.computeVertexNormals();
            geometries.push(geo);
        }
    });
    if (geometries.length === 0) return null;
    try {
        const merged = mergeGeometries(geometries, false);
        console.log(`合并 ${groupNode.name}: ${meshCount} mesh -> 1 (顶点=${merged.attributes.position.count})`);
        return { geometry: merged, material: refMaterial };
    } catch (e) {
        console.warn(`合并 ${groupNode.name} 失败:`, e.message);
        return null;
    }
}

// 确保几何体有 UV 属性（避免 WebGPU 警告）
function ensureUV(geometry) {
    if (geometry && !geometry.attributes.uv) {
        const cnt = geometry.attributes.position.count;
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(cnt * 2), 2));
    }
}

// 识别灯具
function identifyLightFixtures(groupNode) {
    let idx = 0;
    groupNode.traverse((child) => {
        if (child.isMesh) {
            child.userData.deviceType = 'light';
            child.userData.deviceInfo = makeDeviceInfo(child, 'light', idx);
            // 设置自发光（暖白光）
            if (child.material) {
                child.material.emissive = new THREE.Color(0xffe8b0);
                child.material.emissiveIntensity = 0.6;
            }
            lightFixtures.push(child);
            selectableObjects.push(child);
            idx++;
        }
    });
}

// 识别空调（按空间聚类合并相近单元，减少交互对象数量）
function identifyACUnits(groupNode) {
    // 收集所有 mesh 及其世界坐标
    const meshes = [];
    groupNode.traverse((child) => {
        if (child.isMesh) meshes.push(child);
    });
    if (meshes.length === 0) return;

    // 按空间位置聚类：相近的 mesh 归为同一空调单元
    // 注意：mesh 变换烘焙在几何体里，必须用包围盒中心而非 getWorldPosition
    const clusters = [];
    const threshold = 1.5; // 聚类距离阈值（归一化后单位）
    const tmpBox = new THREE.Box3();
    const tmpCenter = new THREE.Vector3();
    meshes.forEach((mesh) => {
        tmpBox.setFromObject(mesh);
        tmpBox.getCenter(tmpCenter);
        let placed = false;
        for (const c of clusters) {
            if (tmpCenter.distanceTo(c.origin) < threshold) {
                c.meshes.push(mesh);
                placed = true;
                break;
            }
        }
        if (!placed) {
            clusters.push({ origin: tmpCenter.clone(), meshes: [mesh] });
        }
    });

    clusters.forEach((cluster, idx) => {
        const acInfo = makeDeviceInfo(cluster.meshes[0], 'ac', idx);
        cluster.meshes.forEach((m) => {
            m.userData.deviceType = 'ac';
            m.userData.deviceInfo = acInfo;
            m.userData.acIndex = idx;
            acUnits.push(m);
            selectableObjects.push(m);
        });
    });
    console.log(`空调聚类: ${meshes.length} mesh -> ${clusters.length} 单元`);
}

// 识别家具
function identifyFurniture(groupNode) {
    groupNode.traverse((child) => {
        if (child.isMesh) {
            child.userData.deviceType = 'furniture';
            child.userData.deviceInfo = makeDeviceInfo(child, 'furniture');
            selectableObjects.push(child);
        }
    });
}

// 识别墙体
function identifyWalls(groupNode) {
    groupNode.traverse((child) => {
        if (child.isMesh) {
            child.userData.deviceType = 'wall';
            child.userData.deviceInfo = makeDeviceInfo(child, 'wall');
            selectableObjects.push(child);
        }
    });
}

// 生成设备信息（带编号）
function makeDeviceInfo(obj, type, index = 0) {
    const base = deviceDB[type] || deviceDB.default;
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const typeNameMap = { light: '灯', ac: '空调', furniture: '家具', wall: '墙体' };
    const name = `${typeNameMap[type] || '设备'}-${String(index + 1).padStart(2, '0')}`;
    return {
        ...base,
        name,
        position: `${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)}`,
        size: `${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)}`,
        temp: type === 'ac' ? state.ac.temperature + '°C' : '-',
        power: type === 'light' ? `${base.power}W` : type === 'ac' ? `${base.power}W` : '-'
    };
}

// ===== 设置点光源（从灯具位置采样） =====
function setupPointLights() {
    // 收集所有灯具的世界坐标（用包围盒中心，因变换烘焙在几何体里）
    const positions = [];
    const tmpBox = new THREE.Box3();
    const tmp = new THREE.Vector3();
    lightFixtures.forEach((mesh) => {
        tmpBox.setFromObject(mesh);
        tmpBox.getCenter(tmp);
        positions.push(tmp.clone());
    });

    if (positions.length === 0) return;

    // 用最远点采样选出最多 N 个代表性位置
    const maxLights = 6;
    const samples = farthestPointSampling(positions, Math.min(maxLights, positions.length));

    samples.forEach((pos, i) => {
        const light = new THREE.PointLight(0xffe8b0, 0, 22, 1.8);
        light.position.set(pos.x, pos.y - 0.3, pos.z);
        light.name = `__pointLight_${i}`;
        light.castShadow = false; // 点光源不投射阴影，性能优先
        scene.add(light);
        pointLights.push(light);
    });
}

// 最远点采样算法
function farthestPointSampling(points, n) {
    if (points.length <= n) return points.slice();
    const result = [points[0]];
    const remaining = points.slice(1);
    while (result.length < n && remaining.length > 0) {
        let maxDist = -1;
        let maxIdx = 0;
        for (let i = 0; i < remaining.length; i++) {
            let minDist = Infinity;
            for (const r of result) {
                const d = remaining[i].distanceTo(r);
                if (d < minDist) minDist = d;
            }
            if (minDist > maxDist) {
                maxDist = minDist;
                maxIdx = i;
            }
        }
        result.push(remaining[maxIdx]);
        remaining.splice(maxIdx, 1);
    }
    return result;
}

// ===== 设置空调气流粒子 =====
function setupAirflow() {
    // 按空调索引分组，每组创建一个气流系统
    const groupMap = new Map();
    acUnits.forEach((mesh) => {
        const idx = mesh.userData.acIndex ?? 0;
        if (!groupMap.has(idx)) groupMap.set(idx, []);
        groupMap.get(idx).push(mesh);
    });

    groupMap.forEach((meshes, idx) => {
        // 计算该组中心
        const box = new THREE.Box3();
        meshes.forEach((m) => box.expandByObject(m));
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const system = createAirflowSystem(center, size, idx);
        airflowSystems.push(system);
        scene.add(system.points);
    });
}

// 创建单个气流粒子系统
function createAirflowSystem(center, size, index) {
    const count = 50;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const ages = new Float32Array(count);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        resetAirflowParticle(positions, velocities, ages, lifetimes, i, center, size);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // 圆形粒子贴图
    const tex = createCircleTexture();

    const mat = new THREE.PointsMaterial({
        color: 0x88ccff,
        size: 0.35,
        map: tex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });

    const points = new THREE.Points(geo, mat);
    points.userData.isAirflow = true;
    points.userData.center = center.clone();
    points.userData.size = size.clone();
    points.userData.velocities = velocities;
    points.userData.ages = ages;
    points.userData.lifetimes = lifetimes;
    points.userData.acIndex = index;

    return { points, mat };
}

function resetAirflowParticle(positions, velocities, ages, lifetimes, i, center, size) {
    // 从空调出风口位置出发
    positions[i * 3] = center.x + (Math.random() - 0.5) * size.x * 0.8;
    positions[i * 3 + 1] = center.y;
    positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * size.z * 0.8;

    // 向下 + 随机扩散
    const angle = Math.random() * Math.PI * 2;
    const spread = 0.3 + Math.random() * 0.4;
    velocities[i * 3] = Math.cos(angle) * spread;
    velocities[i * 3 + 1] = -(0.6 + Math.random() * 0.8);
    velocities[i * 3 + 2] = Math.sin(angle) * spread;

    ages[i] = 0;
    lifetimes[i] = 2.5 + Math.random() * 2;
}

function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
}

// ===== 地面网格与装饰 =====
function setupGround() {
    // 计算模型尺寸用于地面大小
    const box = new THREE.Box3().setFromObject(modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const gs = Math.max(size.x, size.z) * 1.8;

    // 主地面（深色反射）
    const floorGeo = new THREE.PlaneGeometry(gs, gs);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x0a1428,
        roughness: 0.6,
        metalness: 0.4,
        transparent: true,
        opacity: 0.85
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    floor.name = '__floor';
    scene.add(floor);

    // 科技网格线
    const grid = new THREE.GridHelper(gs, 40, 0x00d4ff, 0x0a3050);
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    grid.position.y = -0.01;
    grid.name = '__grid';
    scene.add(grid);

    // 外圈装饰圆环
    const ringGeo = new THREE.RingGeometry(gs * 0.45, gs * 0.46, 64);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0;
    ring.name = '__decoRing';
    scene.add(ring);
}

// ===== 设备位置脉冲标记（垂直光柱） =====
const deviceMarkers = [];
function setupDeviceMarkers() {
    // 为每个空调单元添加脉冲光环
    const acClusters = new Map();
    acUnits.forEach((mesh) => {
        const idx = mesh.userData.acIndex ?? 0;
        if (!acClusters.has(idx)) {
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            acClusters.set(idx, center);
        }
    });

    acClusters.forEach((center) => {
        const marker = createPulseMarker(center, 0x64c8ff);
        deviceMarkers.push(marker);
        scene.add(marker.group);
    });
}

function createPulseMarker(pos, color) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.position.y = 0.02;

    // 地面圆环（脉冲）
    const ringGeo = new THREE.RingGeometry(0.3, 0.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.6, side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    // 垂直光柱
    const beamGeo = new THREE.CylinderGeometry(0.05, 0.15, 3, 8, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.3, side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.5;
    group.add(beam);

    return { group, ring, beam, phase: Math.random() * Math.PI * 2 };
}

function updateDeviceMarkers(time) {
    deviceMarkers.forEach((m) => {
        const pulse = 0.5 + 0.5 * Math.sin(time * 2 + m.phase);
        m.ring.scale.setScalar(0.8 + pulse * 0.6);
        m.ring.material.opacity = 0.6 * (1 - pulse * 0.5);
        m.beam.material.opacity = 0.15 + pulse * 0.25;
    });
}

// ===== 相机适配模型 =====
function fitCameraToModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * Math.PI / 180;
    let dist = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    dist *= 1.5;

    // 低角度斜视，让建筑更有立体感（模型较矮，俯视会显得扁平）
    initialCamera.pos.set(center.x + dist * 0.7, center.y + dist * 0.45, center.z + dist * 0.9);
    initialCamera.target.set(center.x, center.y, center.z);

    camera.position.copy(initialCamera.pos);
    controls.target.copy(initialCamera.target);
    controls.update();
}

// ===== 演示场景（模型加载失败时） =====
function createDemoScene() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 50),
        new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 简单灯具
    for (let i = 0; i < 6; i++) {
        const light = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.15, 2),
            new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffe8b0, emissiveIntensity: 0.6 })
        );
        light.position.set((i % 3 - 1) * 10, 6, (Math.floor(i / 3) - 0.5) * 12);
        light.castShadow = true;
        light.userData.deviceType = 'light';
        light.userData.deviceInfo = makeDeviceInfo(light, 'light', i);
        scene.add(light);
        lightFixtures.push(light);
        selectableObjects.push(light);
    }

    // 简单空调
    for (let i = 0; i < 2; i++) {
        const ac = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0xeeeeee })
        );
        ac.position.set((i === 0 ? -1 : 1) * 15, 5, -12);
        ac.castShadow = true;
        ac.userData.deviceType = 'ac';
        ac.userData.deviceInfo = makeDeviceInfo(ac, 'ac', i);
        scene.add(ac);
        acUnits.push(ac);
        selectableObjects.push(ac);
    }

    setupPointLights();
    setupAirflow();
    applyLighting();
    applyAC();
    buildDeviceList();
    updateStatus();
}

// ===== 事件处理 =====
function setupEvents() {
    window.addEventListener('resize', onWindowResize);
    const dom = renderer.domElement;
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('click', onPointerClick);
    dom.addEventListener('dblclick', onDoubleClick);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

function getMouseNDC(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
}

const raycaster = new THREE.Raycaster();

function onPointerMove(event) {
    const mouse = getMouseNDC(event);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(selectableObjects, false);

    if (hits.length > 0) {
        const obj = hits[0].object;
        if (hoveredObject !== obj) {
            hoveredObject = obj;
            renderer.domElement.style.cursor = 'pointer';
        }
    } else {
        if (hoveredObject) {
            hoveredObject = null;
            renderer.domElement.style.cursor = 'grab';
        }
    }
}

function onPointerClick(event) {
    const mouse = getMouseNDC(event);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(selectableObjects, false);

    if (hits.length > 0) {
        const obj = findSelectableRoot(hits[0].object);
        if (selectedObject === obj) {
            deselectObject();
        } else {
            deselectObject();
            selectObject(obj);
        }
    } else {
        deselectObject();
    }
}

function onDoubleClick(event) {
    const mouse = getMouseNDC(event);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(selectableObjects, false);
    if (hits.length > 0) {
        const obj = findSelectableRoot(hits[0].object);
        focusOnObject(obj);
        selectObject(obj);
    }
}

// 找到可选择的根节点（同一个设备的多个 mesh 共享 deviceInfo）
function findSelectableRoot(obj) {
    let cur = obj;
    while (cur) {
        if (cur.userData.deviceInfo && cur.userData.deviceInfo.name) {
            return cur;
        }
        cur = cur.parent;
    }
    return obj;
}

// ===== 选择/取消选择 =====
function selectObject(obj) {
    selectedObject = obj;
    // 高亮：增强自发光
    obj.traverseVisible((child) => {
        if (child.isMesh && child.material) {
            child.userData._hlEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color();
            child.userData._hlIntensity = child.material.emissiveIntensity || 0;
            child.material.emissive = new THREE.Color(0x00d4ff);
            child.material.emissiveIntensity = 0.7;
        }
    });

    showDeviceInfo(obj);
    highlightDeviceListItem(obj);
    showToast(`已选中: ${obj.userData.deviceInfo?.name || '设备'}`);
}

function deselectObject() {
    if (selectedObject) {
        selectedObject.traverseVisible((child) => {
            if (child.isMesh && child.material && child.userData._hlEmissive !== undefined) {
                child.material.emissive = child.userData._hlEmissive;
                child.material.emissiveIntensity = child.userData._hlIntensity;
                delete child.userData._hlEmissive;
                delete child.userData._hlIntensity;
            }
        });
        selectedObject = null;
    }
    hideDeviceInfo();
    highlightDeviceListItem(null);
}

// ===== 聚焦物体（平滑动画） =====
function focusOnObject(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 2);
    const dist = maxDim * 3 + 3;

    const dir = new THREE.Vector3(0.8, 0.5, 0.9).normalize();
    const endPos = center.clone().add(dir.multiplyScalar(dist));

    cameraTween = {
        startPos: camera.position.clone(),
        endPos,
        startTarget: controls.target.clone(),
        endTarget: center.clone(),
        time: 0,
        duration: 0.9
    };
}

// ===== 信息面板 =====
function showDeviceInfo(obj) {
    const info = obj.userData.deviceInfo || deviceDB.default;
    const panel = document.getElementById('info-panel');
    const listPanel = document.getElementById('device-list-panel');

    document.getElementById('device-name').textContent = info.name || info.typeName;
    document.getElementById('device-status-pill').textContent = info.status || '运行中';

    const typeMap = {
        light: '照明设备',
        ac: '空调设备',
        furniture: '办公家具',
        wall: '建筑结构'
    };
    document.getElementById('device-type-badge').textContent = info.typeName || typeMap[obj.userData.deviceType] || '设备';

    const fields = buildInfoFields(obj, info);
    document.getElementById('device-info-content').innerHTML = fields;

    // 显示信息面板，隐藏列表
    listPanel.classList.add('hidden');
    panel.classList.add('show');
    state.showList = false;
}

function hideDeviceInfo() {
    document.getElementById('info-panel').classList.remove('show');
    if (!state.showList) {
        document.getElementById('device-list-panel').classList.remove('hidden');
        state.showList = true;
    }
}

function buildInfoFields(obj, info) {
    const rows = [
        { label: '设备状态', value: info.status, icon: '●' },
        { label: '额定功率', value: info.power, full: false },
        { label: '品牌', value: info.brand },
        { label: '型号', value: info.model },
        { label: '运行温度', value: info.temp },
        { label: '电压', value: info.voltage || '-' }
    ];

    if (obj.userData.deviceType === 'light') {
        rows.push({ label: '色温', value: info.colorTemp });
        rows.push({ label: '使用寿命', value: info.lifespan });
    }
    if (obj.userData.deviceType === 'ac') {
        rows.push({ label: '制冷剂', value: info.refrigerant });
        rows.push({ label: '风量', value: info.airflow });
        rows.push({ label: '噪音', value: info.noise });
    }
    if (obj.userData.deviceType === 'furniture') {
        rows.push({ label: '材质', value: info.material });
        rows.push({ label: '质保', value: info.warranty });
    }
    if (obj.userData.deviceType === 'wall') {
        rows.push({ label: '材质', value: info.material });
        rows.push({ label: '防火等级', value: info.fireRating });
    }

    rows.push({ label: '空间坐标', value: info.position, full: true });
    rows.push({ label: '尺寸 (W×H×D)', value: info.size, full: true });
    if (info.installDate) rows.push({ label: '安装日期', value: info.installDate });
    if (info.lastMaintenance) rows.push({ label: '最近维护', value: info.lastMaintenance });

    return rows.map(r => `
        <div class="info-cell${r.full ? ' full' : ''}">
            <div class="label">${r.label}</div>
            <div class="value">${r.value}</div>
        </div>
    `).join('');
}

// ===== 照明系统 =====
function applyLighting() {
    const { enabled, brightness } = state.lighting;
    const b = brightness; // 0-1

    // 点光源
    pointLights.forEach((light) => {
        light.intensity = enabled ? b * 18 : 0;
    });

    // 灯具自发光
    lightFixtures.forEach((mesh) => {
        if (mesh.material && !mesh.userData._hlEmissive) {
            mesh.material.emissive = new THREE.Color(enabled ? 0xffe8b0 : 0x000000);
            mesh.material.emissiveIntensity = enabled ? 0.4 + b * 0.8 : 0;
        }
    });

    // 环境光随之变化（灯关时场景变暗）
    const ambient = scene.getObjectByName('__ambient');
    if (ambient) ambient.intensity = enabled ? 0.35 + b * 0.25 : 0.08;

    const hemi = scene.getObjectByName('__hemi');
    if (hemi) hemi.intensity = enabled ? 0.25 : 0.06;

    // 渲染器曝光微调
    renderer.toneMappingExposure = enabled ? 0.85 + b * 0.35 : 0.4;

    // 更新 UI
    const tag = document.getElementById('light-status');
    tag.textContent = enabled ? 'ONLINE' : 'OFFLINE';
    tag.classList.toggle('off', !enabled);
    document.getElementById('lighting-toggle').classList.toggle('active', enabled);
    document.getElementById('lighting-toggle-text').textContent = enabled ? '照明已开启' : '照明已关闭';
    document.getElementById('brightness-value').textContent = Math.round(b * 100);
    document.getElementById('lighting-brightness').style.setProperty('--pct', Math.round(b * 100) + '%');

    updateStatus();
}

// ===== 空调系统 =====
function applyAC() {
    const { enabled, temperature } = state.ac;

    // 气流粒子可见性
    airflowSystems.forEach((sys) => {
        sys.mat.opacity = enabled ? 0.55 : 0;
        sys.mat.visible = enabled;
    });

    // 温度色调映射：冷色(16°C) -> 中性(24°C) -> 暖色(30°C)
    const t = (temperature - 16) / 14; // 0-1
    let fogColor, ambientColor, particleColor;

    if (t < 0.4) {
        // 冷色调：蓝
        const k = (0.4 - t) / 0.4;
        fogColor = new THREE.Color(0x06081a).lerp(new THREE.Color(0x0a1428), k);
        ambientColor = new THREE.Color(0x6688aa).lerp(new THREE.Color(0x4466aa), k * 0.5);
        particleColor = new THREE.Color(0x88ccff).lerp(new THREE.Color(0x44aaff), k * 0.5);
    } else if (t > 0.6) {
        // 暖色调：橙
        const k = (t - 0.6) / 0.4;
        fogColor = new THREE.Color(0x06081a).lerp(new THREE.Color(0x1a1008), k);
        ambientColor = new THREE.Color(0x6688aa).lerp(new THREE.Color(0xaa8866), k * 0.5);
        particleColor = new THREE.Color(0x88ccff).lerp(new THREE.Color(0xffaa66), k * 0.6);
    } else {
        // 中性
        fogColor = new THREE.Color(0x06081a);
        ambientColor = new THREE.Color(0x6688aa);
        particleColor = new THREE.Color(0x88ccff);
    }

    if (enabled) {
        scene.fog.color = fogColor;
        scene.background = fogColor;
    } else {
        scene.fog.color = new THREE.Color(0x06081a);
        scene.background = new THREE.Color(0x06081a);
    }

    const ambient = scene.getObjectByName('__ambient');
    if (ambient && state.lighting.enabled) {
        ambient.color = enabled ? ambientColor : new THREE.Color(0x6688aa);
    }

    // 气流粒子颜色
    airflowSystems.forEach((sys) => {
        sys.mat.color = enabled ? particleColor : sys.mat.color;
    });

    // 更新空调设备信息中的温度
    acUnits.forEach((mesh) => {
        if (mesh.userData.deviceInfo) {
            mesh.userData.deviceInfo.temp = enabled ? `${temperature}°C` : '待机';
        }
    });
    if (selectedObject && selectedObject.userData.deviceType === 'ac') {
        showDeviceInfo(selectedObject);
    }

    // UI
    const tag = document.getElementById('ac-status');
    tag.textContent = enabled ? 'ONLINE' : 'OFFLINE';
    tag.classList.toggle('off', !enabled);
    document.getElementById('ac-toggle').classList.toggle('active', enabled);
    document.getElementById('ac-toggle-text').textContent = enabled ? '空调已开启' : '空调已关闭';
    document.getElementById('temperature-value').textContent = temperature;
    document.getElementById('ac-temperature').style.setProperty('--pct', Math.round((temperature - 16) / 14 * 100) + '%');

    updateStatus();
}

// ===== 状态栏更新 =====
function updateStatus() {
    const lightCount = lightFixtures.length > 0 ? new Set(lightFixtures.map(m => m.userData.deviceInfo?.name)).size : 0;
    const acCount = acUnits.length > 0 ? new Set(acUnits.map(m => m.userData.acIndex)).size : 0;
    const total = lightCount + acCount;
    const active = (state.lighting.enabled ? lightCount : 0) + (state.ac.enabled ? acCount : 0);

    const lightPower = state.lighting.enabled ? lightCount * deviceDB.light.power : 0;
    const acPower = state.ac.enabled ? acCount * deviceDB.ac.power : 0;
    const totalPower = (lightPower + acPower) / 1000;

    document.getElementById('total-devices').innerHTML = `${total}<span class="unit">台</span>`;
    document.getElementById('active-devices').innerHTML = `${active}<span class="unit">台</span>`;
    document.getElementById('total-power').innerHTML = `${totalPower.toFixed(1)}<span class="unit">kW</span>`;
    document.getElementById('avg-temp').innerHTML = `${state.ac.enabled ? state.ac.temperature : '--'}<span class="unit">°C</span>`;
    document.getElementById('lux-value').innerHTML = `${state.lighting.enabled ? Math.round(300 + state.lighting.brightness * 450) : 30}<span class="unit">lx</span>`;

    // 能耗等级
    let level = 'A', levelClass = 'good';
    if (totalPower > 8) { level = 'C'; levelClass = 'warn'; }
    else if (totalPower > 5) { level = 'B'; levelClass = ''; }
    else if (totalPower > 2) { level = 'A'; levelClass = 'good'; }
    else { level = 'A+'; levelClass = 'good'; }
    const levelEl = document.getElementById('energy-level');
    levelEl.textContent = level;
    levelEl.className = 'value ' + levelClass;

    // KPI 总能耗
    animateNumber('kpi-power', totalPower, 1);
    // 趋势（伪随机）
    const trendVal = (Math.random() * 10 - 3).toFixed(1);
    const trendEl = document.getElementById('kpi-trend');
    const trendValEl = document.getElementById('kpi-trend-val');
    if (parseFloat(trendVal) >= 0) {
        trendEl.className = 'kpi-trend';
        trendEl.querySelector('span').textContent = '▲';
        trendValEl.textContent = '+' + trendVal + '%';
    } else {
        trendEl.className = 'kpi-trend down';
        trendEl.querySelector('span').textContent = '▼';
        trendValEl.textContent = trendVal + '%';
    }

    // 能耗标签
    const energyTag = document.getElementById('energy-tag');
    if (totalPower > 8) { energyTag.textContent = 'HIGH'; energyTag.className = 'status-tag'; energyTag.style.borderColor = 'var(--warn)'; energyTag.style.color = 'var(--warn)'; }
    else { energyTag.textContent = 'NORMAL'; energyTag.className = 'status-tag'; energyTag.style.borderColor = ''; energyTag.style.color = ''; }

    // 更新环形图
    updateDeviceRing(lightCount, acCount, active);
}

// 数字滚动动画
function animateNumber(elId, target, decimals = 0) {
    const el = document.getElementById(elId);
    if (!el) return;
    const cur = parseFloat(el.dataset.cur || '0');
    el.dataset.cur = target;
    const start = cur;
    const dur = 600;
    const t0 = performance.now();
    function step(now) {
        const t = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = start + (target - start) * eased;
        el.textContent = v.toFixed(decimals);
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// 更新设备环形图
function updateDeviceRing(lightCount, acCount, active) {
    const total = lightCount + acCount;
    document.getElementById('ring-total').textContent = total;
    document.getElementById('leg-light').textContent = lightCount;
    document.getElementById('leg-ac').textContent = acCount;
    document.getElementById('leg-online').textContent = active;
    const C = 2 * Math.PI * 42; // ≈264
    // 灯占上半，空调占下半
    const lightPct = total > 0 ? lightCount / total : 0;
    const acPct = total > 0 ? acCount / total : 0;
    const lightActivePct = state.lighting.enabled ? lightPct : 0;
    const acActivePct = state.ac.enabled ? acPct : 0;
    document.getElementById('ring-light').setAttribute('stroke-dasharray', `${lightActivePct * C} ${C}`);
    document.getElementById('ring-light').setAttribute('stroke-dashoffset', '0');
    document.getElementById('ring-ac').setAttribute('stroke-dasharray', `${acActivePct * C} ${C}`);
    document.getElementById('ring-ac').setAttribute('stroke-dashoffset', `${-lightActivePct * C}`);
}

// ===== 迷你折线图（能耗趋势） =====
let powerHistory = [];
const POWER_HISTORY_MAX = 30;
function initPowerHistory() {
    powerHistory = [];
    for (let i = 0; i < POWER_HISTORY_MAX; i++) {
        powerHistory.push(20 + Math.random() * 15);
    }
}
function pushPowerHistory(val) {
    powerHistory.push(val);
    if (powerHistory.length > POWER_HISTORY_MAX) powerHistory.shift();
    drawPowerChart();
}
function drawPowerChart() {
    const canvas = document.getElementById('power-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (powerHistory.length < 2) return;
    const max = Math.max(...powerHistory) * 1.1;
    const min = Math.min(...powerHistory) * 0.9;
    const range = max - min || 1;
    const stepX = W / (POWER_HISTORY_MAX - 1);

    // 渐变填充
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
    grad.addColorStop(1, 'rgba(0, 212, 255, 0)');
    ctx.beginPath();
    ctx.moveTo(0, H);
    powerHistory.forEach((v, i) => {
        const x = i * stepX;
        const y = H - ((v - min) / range) * H;
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // 折线
    ctx.beginPath();
    powerHistory.forEach((v, i) => {
        const x = i * stepX;
        const y = H - ((v - min) / range) * H;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 6;
    ctx.stroke();

    // 末端点
    const lastX = (powerHistory.length - 1) * stepX;
    const lastY = H - ((powerHistory[powerHistory.length - 1] - min) / range) * H;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.fill();
}

// ===== 告警流 =====
const alertTemplates = [
    { type: 'info', msg: '照明系统-灯-12 状态切换为开启' },
    { type: 'info', msg: '空调系统-空调-03 温度调整为 24°C' },
    { type: 'warning', msg: '灯-28 功率波动检测，建议巡检' },
    { type: 'info', msg: '设备列表已刷新，共 0 台设备' },
    { type: 'danger', msg: '空调-07 通讯超时，已自动重连' },
    { type: 'info', msg: '环境照度恢复至 500lx 以上' },
    { type: 'warning', msg: 'CO₂ 浓度接近预警阈值 600ppm' },
    { type: 'info', msg: '系统巡检任务已完成' }
];
let alertList = [];
function pushAlert(type, msg) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    alertList.unshift({ type, msg, time });
    if (alertList.length > 20) alertList.pop();
    renderAlerts();
}
function renderAlerts() {
    const list = document.getElementById('alert-list');
    const iconMap = { info: '◆', warning: '▲', danger: '●' };
    list.innerHTML = alertList.map(a => `
        <div class="alert-item ${a.type}">
            <span class="alert-icon">${iconMap[a.type] || '◆'}</span>
            <div class="alert-content">
                <div class="alert-msg">${a.msg}</div>
                <div class="alert-time">${a.time}</div>
            </div>
        </div>
    `).join('');
    document.getElementById('alert-count').textContent = `${alertList.length} ALERTS`;
}
// 定时生成模拟告警
function startAlertSimulation() {
    // 初始几条
    pushAlert('info', '数字孪生系统已上线');
    pushAlert('info', `场景加载完成，识别 ${lightFixtures.length} 个灯具`);
    pushAlert('info', `空调聚类完成，识别 ${new Set(acUnits.map(m => m.userData.acIndex)).size} 个单元`);
    // 定时
    setInterval(() => {
        const tpl = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
        pushAlert(tpl.type, tpl.msg.replace('0', new Set(acUnits.map(m => m.userData.acIndex)).size + new Set(lightFixtures.map(m => m.userData.deviceInfo?.name)).size));
    }, 8000);
}

// 在线人数模拟
let onlinePeople = 0;
function startPeopleSimulation() {
    onlinePeople = 30 + Math.floor(Math.random() * 40);
    document.getElementById('online-people').innerHTML = `${onlinePeople}<span class="sub">人</span>`;
    setInterval(() => {
        onlinePeople += Math.floor(Math.random() * 7) - 3;
        onlinePeople = Math.max(15, Math.min(95, onlinePeople));
        document.getElementById('online-people').innerHTML = `${onlinePeople}<span class="sub">人</span>`;
    }, 5000);
}

// ===== 设备列表 =====
function buildDeviceList() {
    const list = document.getElementById('device-list');
    const items = [];

    // 灯具
    const lightNames = new Set();
    lightFixtures.forEach((m) => {
        const name = m.userData.deviceInfo?.name;
        if (name && !lightNames.has(name)) {
            lightNames.add(name);
            items.push({
                name,
                type: 'light',
                meta: `${deviceDB.light.power}W · ${deviceDB.light.colorTemp}`,
                obj: m
            });
        }
    });

    // 空调
    const acNames = new Map();
    acUnits.forEach((m) => {
        const name = m.userData.deviceInfo?.name;
        if (name && !acNames.has(name)) {
            acNames.set(name, m);
            items.push({
                name,
                type: 'ac',
                meta: `${deviceDB.ac.power}W · ${state.ac.temperature}°C`,
                obj: m
            });
        }
    });

    document.getElementById('device-count').textContent = `${items.length} 台`;

    list.innerHTML = items.map((item, i) => `
        <div class="device-item ${item.type}" data-idx="${i}">
            <div class="device-icon">${item.type === 'light' ? 'L' : 'A'}</div>
            <div class="device-info">
                <div class="name">${item.name}</div>
                <div class="meta">${item.meta}</div>
            </div>
            <div class="device-status-dot ${item.type === 'light' ? (state.lighting.enabled ? '' : 'off') : (state.ac.enabled ? '' : 'off')}"></div>
        </div>
    `).join('');

    // 绑定点击
    list.querySelectorAll('.device-item').forEach((el, i) => {
        el.addEventListener('click', () => {
            const item = items[i];
            selectObject(item.obj);
            focusOnObject(item.obj);
        });
    });

    list._items = items;
}

function highlightDeviceListItem(obj) {
    const list = document.getElementById('device-list');
    list.querySelectorAll('.device-item').forEach((el) => el.classList.remove('active'));
    if (!obj) return;
    const name = obj.userData.deviceInfo?.name;
    const items = list._items || [];
    const idx = items.findIndex((it) => it.name === name);
    if (idx >= 0) {
        const el = list.querySelector(`.device-item[data-idx="${idx}"]`);
        if (el) el.classList.add('active');
    }
}

// ===== UI 事件绑定 =====
function setupUIEvents() {
    // 照明开关
    document.getElementById('lighting-toggle').addEventListener('click', () => {
        state.lighting.enabled = !state.lighting.enabled;
        applyLighting();
        buildDeviceList();
        showToast(state.lighting.enabled ? '照明系统已开启' : '照明系统已关闭');
        pushAlert(state.lighting.enabled ? 'info' : 'warning', `照明系统已${state.lighting.enabled ? '开启' : '关闭'}`);
    });

    // 亮度
    document.getElementById('lighting-brightness').addEventListener('input', (e) => {
        state.lighting.brightness = e.target.value / 100;
        applyLighting();
    });

    // 空调开关
    document.getElementById('ac-toggle').addEventListener('click', () => {
        state.ac.enabled = !state.ac.enabled;
        applyAC();
        buildDeviceList();
        showToast(state.ac.enabled ? '空调系统已开启' : '空调系统已关闭');
        pushAlert(state.ac.enabled ? 'info' : 'warning', `空调系统已${state.ac.enabled ? '开启' : '关闭'}`);
    });

    // 温度
    document.getElementById('ac-temperature').addEventListener('input', (e) => {
        state.ac.temperature = parseInt(e.target.value);
        applyAC();
        buildDeviceList();
    });

    // 自动旋转
    document.getElementById('auto-rotate').addEventListener('click', function () {
        state.autoRotate = !state.autoRotate;
        controls.autoRotate = state.autoRotate;
        controls.autoRotateSpeed = 0.8;
        this.classList.toggle('active', state.autoRotate);
        showToast(state.autoRotate ? '自动旋转已开启' : '自动旋转已关闭');
    });

    // 重置视角
    document.getElementById('reset-view').addEventListener('click', () => {
        cameraTween = {
            startPos: camera.position.clone(),
            endPos: initialCamera.pos.clone(),
            startTarget: controls.target.clone(),
            endTarget: initialCamera.target.clone(),
            time: 0,
            duration: 0.8
        };
        showToast('视角已重置');
    });

    // 俯视
    document.getElementById('top-view').addEventListener('click', () => {
        const box = modelRoot ? new THREE.Box3().setFromObject(modelRoot) : new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(40, 20, 40));
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const dist = Math.max(size.x, size.z) * 1.1;
        cameraTween = {
            startPos: camera.position.clone(),
            endPos: new THREE.Vector3(center.x, center.y + dist, center.z + 0.01),
            startTarget: controls.target.clone(),
            endTarget: center.clone(),
            time: 0,
            duration: 0.8
        };
        showToast('已切换至俯视视角');
    });

    // 切换设备列表
    document.getElementById('toggle-list').addEventListener('click', function () {
        const listPanel = document.getElementById('device-list-panel');
        const infoPanel = document.getElementById('info-panel');
        state.showList = !state.showList;
        if (state.showList) {
            listPanel.classList.remove('hidden');
            infoPanel.classList.remove('show');
            deselectObject();
        } else {
            listPanel.classList.add('hidden');
        }
        this.classList.toggle('active', state.showList);
    });

    // 关闭信息面板
    document.getElementById('close-info').addEventListener('click', () => {
        deselectObject();
    });

    // 时钟
    setInterval(updateClock, 1000);
    updateClock();
}

function updateClock() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    document.getElementById('clock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function updateDate() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    document.getElementById('date').textContent = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ===== Toast =====
let toastTimer = null;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

// ===== 加载提示 =====
function updateLoaderText(text) {
    const el = document.getElementById('loader-text');
    if (el) el.textContent = text;
}

function hideLoader() {
    const loader = document.getElementById('loader');
    loader.classList.add('hidden');
    setTimeout(() => { loader.style.display = 'none'; }, 600);
}

// ===== 动画循环 =====
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // 相机动画
    if (cameraTween) {
        cameraTween.time += delta;
        const t = Math.min(cameraTween.time / cameraTween.duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        camera.position.lerpVectors(cameraTween.startPos, cameraTween.endPos, eased);
        controls.target.lerpVectors(cameraTween.startTarget, cameraTween.endTarget, eased);
        if (t >= 1) cameraTween = null;
    }

    controls.update();

    // 更新设备脉冲标记
    updateDeviceMarkers(clock.elapsedTime);

    // 更新气流粒子
    if (state.ac.enabled) {
        updateAirflow(delta);
    }

    // FPS
    fpsCounter.frames++;
    const now = performance.now();
    if (now - fpsCounter.lastTime >= 1000) {
        fpsCounter.value = Math.round((fpsCounter.frames * 1000) / (now - fpsCounter.lastTime));
        fpsCounter.frames = 0;
        fpsCounter.lastTime = now;
        document.getElementById('fps-value').textContent = fpsCounter.value;
    }

    if (composer) composer.render();
    else renderer.render(scene, camera);
}

// 更新气流粒子
function updateAirflow(delta) {
    airflowSystems.forEach((sys) => {
        const points = sys.points;
        const pos = points.geometry.attributes.position.array;
        const vel = points.userData.velocities;
        const ages = points.userData.ages;
        const lifetimes = points.userData.lifetimes;
        const center = points.userData.center;
        const size = points.userData.size;

        for (let i = 0; i < pos.length / 3; i++) {
            ages[i] += delta;
            if (ages[i] > lifetimes[i] || pos[i * 3 + 1] < 0) {
                resetAirflowParticle(pos, vel, ages, lifetimes, i, center, size);
                continue;
            }
            pos[i * 3] += vel[i * 3] * delta;
            pos[i * 3 + 1] += vel[i * 3 + 1] * delta;
            pos[i * 3 + 2] += vel[i * 3 + 2] * delta;
            // 重力衰减 + 扩散
            vel[i * 3 + 1] += 0.3 * delta;
            vel[i * 3] *= 1.02;
            vel[i * 3 + 2] *= 1.02;
        }
        points.geometry.attributes.position.needsUpdate = true;
    });
}

// ===== 启动 =====
window.addEventListener('DOMContentLoaded', () => {
    init().catch((err) => {
        console.error('初始化失败:', err);
        updateLoaderText('初始化失败: ' + err.message);
    });
});
