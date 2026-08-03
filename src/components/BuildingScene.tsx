'use client';

import { useEffect, useRef, useState } from 'react';
import CockpitPanel from './CockpitPanel';
import SolarPanel from './SolarPanel';
import CarbonPanel from './CarbonPanel';
import ChargingPanel from './ChargingPanel';
import LoadManagementPanel from './LoadManagementPanel';
import GridPanel from './GridPanel';
import OverviewPanel2 from './OverviewPanel2';
import * as THREE from 'three';
import { WebGPURenderer, RectAreaLightNode } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
import { RectAreaLightTexturesLib } from 'three/addons/lights/RectAreaLightTexturesLib.js';

// 模块级初始化 RectAreaLight LTC 纹理（必须在任何 RectAreaLight 节点构建前完成注册）
RectAreaLightTexturesLib.init();
RectAreaLightNode.setLTC(RectAreaLightTexturesLib);

// ===== 设备信息数据库 =====
const deviceDB: any = {
  light: {
    typeName: '照明灯具', power: 36, voltage: '220V', brand: 'Philips',
    model: 'LED Panel Pro', lifespan: '50000h', colorTemp: '4000K',
    installDate: '2024-01-15', lastMaintenance: '2024-06-20', status: '运行中'
  },
  ac: {
    typeName: '空调设备', power: 1500, voltage: '220V', brand: 'Daikin',
    model: 'VRV-X RXQ71', refrigerant: 'R410A', airflow: '1200 m³/h',
    noise: '38 dB', installDate: '2023-12-01', lastMaintenance: '2024-05-10', status: '运行中'
  },
  furniture: { typeName: '办公家具', material: '环保板材', brand: 'Steelcase', warranty: '5年', installDate: '2024-02-20', status: '正常' },
  wall: { typeName: '建筑结构', material: '钢混结构', fireRating: 'A级', status: '正常' },
  default: { typeName: '场景对象', status: '正常' }
};

interface DeviceListItem { name: string; type: string; meta: string; obj: any; }
interface AlertItem { type: 'info' | 'warning' | 'danger'; msg: string; time: string; }
interface InfoField { label: string; value: string; full?: boolean; }

export default function BuildingScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeRef = useRef<any>({});

  // UI 状态
  const [loading, setLoading] = useState(true);
  const [loaderText, setLoaderText] = useState('INITIALIZING SYSTEM');
  const [loaderPct, setLoaderPct] = useState(0);
  const [renderMode, setRenderMode] = useState('WebGPU');
  const [lightingMode, setLightingMode] = useState<'rect' | 'emissive'>('emissive'); // 默认发光材质模式（低配置友好）
  const [fps, setFps] = useState(0);
  const [clock, setClock] = useState('--:--:--');
  const [date, setDate] = useState('');

  const [lightingOn, setLightingOn] = useState(true);
  const [brightness, setBrightness] = useState(80);
  const [acOn, setAcOn] = useState(true);
  const [temperature, setTemperature] = useState(24);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showList, setShowList] = useState(true);
  const [activeModule, setActiveModule] = useState<'overview' | 'overview2' | 'building' | 'solar' | 'charging' | 'carbon' | 'load' | 'grid'>('overview2');
  const [activeFloor, setActiveFloor] = useState(0);

  const [deviceList, setDeviceList] = useState<DeviceListItem[]>([]);
  const [activeDeviceIdx, setActiveDeviceIdx] = useState(-1);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [onlinePeople, setOnlinePeople] = useState(0);

  const [kpiPower, setKpiPower] = useState('0.0');
  const [kpiTrend, setKpiTrend] = useState<{ val: string; up: boolean }>({ val: '+0.0%', up: true });
  const [energyTag, setEnergyTag] = useState('NORMAL');
  const [energyTagWarn, setEnergyTagWarn] = useState(false);

  const powerChartRef = useRef<HTMLCanvasElement>(null);
  const powerHistoryRef = useRef<number[]>([]);
  const toastTimerRef = useRef<any>(null);
  const [toastMsg, setToastMsg] = useState('');

  // 初始化 Three.js
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    const T: any = threeRef.current;

    const init = async () => {
      T.clock = new THREE.Clock();
      T.scene = new THREE.Scene();
      T.scene.background = new THREE.Color(0x0a1228);
      T.scene.fog = new THREE.FogExp2(0x0a1228, 0.008);

      T.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
      T.camera.position.set(30, 22, 30);

      // 渲染器
      // 强制使用 WebGPU 渲染器
      setLoaderText('初始化 WebGPU 渲染器...');
      T.renderer = new WebGPURenderer({ antialias: true, powerPreference: 'high-performance' });
      await T.renderer.init();
      // 检测实际后端（测试环境可能回退 WebGL2）
      const isWebGPU = T.renderer.backend && T.renderer.backend.isWebGPUBackend;
      setRenderMode(isWebGPU ? 'WebGPU' : 'WebGL2');
      T.renderer.setSize(window.innerWidth, window.innerHeight);
      // 优化：降低 pixelRatio 提升渲染速度（低配置友好）
      T.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
      // 优化：关闭阴影（灯光模式下阴影是性能瓶颈）
      T.renderer.shadowMap.enabled = false;
      T.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      T.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      T.renderer.toneMappingExposure = 1.05;
      containerRef.current!.appendChild(T.renderer.domElement);

      // 控制器
      T.controls = new OrbitControls(T.camera, T.renderer.domElement);
      T.controls.enableDamping = true;
      T.controls.dampingFactor = 0.06;
      T.controls.screenSpacePanning = true;
      T.controls.minDistance = 6;
      T.controls.maxDistance = 120;
      T.controls.maxPolarAngle = Math.PI / 2 + 0.15;

      setupEnvironment(T);
      setLoaderText('加载 3D 模型...');
      await loadModel(T);

      if (disposed) return;
      setLoading(false);
      T.initialCamera = { pos: T.camera.position.clone(), target: T.controls.target.clone() };

      // 事件
      window.addEventListener('resize', onResize);
      T.renderer.domElement.addEventListener('pointermove', onPointerMove);
      T.renderer.domElement.addEventListener('click', onPointerClick);
      T.renderer.domElement.addEventListener('dblclick', onDoubleClick);

      // 暴露调试对象
      (window as any).__three = T;

      animate();
    };

    // ===== 环境（白膜效果：适当环境光 + 方向光投影 + HDR 反射） =====
    function setupEnvironment(T: any) {
      // 环境光（白膜需要适当环境光体现立体感）
      const ambient = new THREE.AmbientLight(0xb0c4de, 0.4);
      ambient.name = '__ambient';
      T.scene.add(ambient);

      // 方向光（投影 + 主照明）
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(30, 45, 18);
      dirLight.target.position.set(0, 0, 0);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(2048, 2048);
      dirLight.shadow.camera.near = 1;
      dirLight.shadow.camera.far = 120;
      dirLight.shadow.camera.left = -28;
      dirLight.shadow.camera.right = 28;
      dirLight.shadow.camera.top = 22;
      dirLight.shadow.camera.bottom = -22;
      dirLight.shadow.bias = -0.0002;
      dirLight.shadow.normalBias = 0.015;
      T.scene.add(dirLight);
      T.scene.add(dirLight.target);
      dirLight.name = '__directional';

      // 半球光（天空/地面反射，让白膜有冷暖变化）
      const hemi = new THREE.HemisphereLight(0xc4d8f0, 0x808890, 0.35);
      hemi.name = '__hemi';
      T.scene.add(hemi);

      // 背景色：深蓝（统一，不随空调温度变化，避免暗灰蓝色调）
      T.scene.background = new THREE.Color(0x0a1228);

      // HDR 环境贴图（仅用于 PBR 反射，强度很低，避免暗灰蓝色调主导）
      setLoaderText('加载 HDR 环境贴图...');
      const rgbeLoader = new RGBELoader();
      rgbeLoader.load('/studio_small.hdr', (envTexture: any) => {
        envTexture.mapping = THREE.EquirectangularReflectionMapping;
        T.scene.environment = envTexture;
        T.scene.environmentIntensity = 0.4; // 适当反射，白膜有质感不发灰
        T.envTexture = envTexture;
        console.log('HDR 环境贴图加载完成');
      }, undefined, (err: any) => {
        console.warn('HDR 加载失败:', err);
      });
    }

    // ===== 加载模型 =====
    function loadModel(T: any) {
      return new Promise<void>((resolve) => {
        const loader = new GLTFLoader();
        loader.load('/scene.glb', (gltf: any) => {
          T.modelRoot = gltf.scene;
          normalizeModel(T.modelRoot);

          const groups: any = { light: null, ac: null, furniture: null, wall: null, logos: [] };
          T.modelRoot.traverse((child: any) => {
            const n = child.name;
            if (n === '灯') groups.light = child;
            else if (n === '空调') groups.ac = child;
            else if (n === 'zhuoyi' || n === '桌椅') groups.furniture = child;
            else if (n === 'qiangti' || n === '墙体') groups.wall = child;
            else if (n && n.startsWith('logo')) groups.logos.push(child);
          });

          T.scene.add(T.modelRoot);

          // 合并墙体
          if (groups.wall) {
            const merged = mergeGroupGeometries(groups.wall, T.modelRoot);
            if (merged) {
              const m = new THREE.Mesh(merged.geometry, makeThemeMaterial('wall'));
              m.name = 'merged_wall';
              m.castShadow = true; m.receiveShadow = true;
              m.userData.deviceType = 'wall';
              m.userData.themeApplied = true; // 标记已应用主题材质，避免被 traverse 覆盖
              m.userData.deviceInfo = makeDeviceInfo(m, 'wall', 0);
              T.modelRoot.remove(groups.wall);
              T.modelRoot.add(m);
              T.selectableObjects.push(m);
            }
          }
          // 合并桌椅
          if (groups.furniture) {
            const merged = mergeGroupGeometries(groups.furniture, T.modelRoot);
            if (merged) {
              const m = new THREE.Mesh(merged.geometry, makeThemeMaterial('furniture'));
              m.name = 'merged_furniture';
              m.castShadow = true; m.receiveShadow = true;
              m.userData.deviceType = 'furniture';
              m.userData.themeApplied = true;
              m.userData.deviceInfo = makeDeviceInfo(m, 'furniture', 0);
              T.modelRoot.remove(groups.furniture);
              T.modelRoot.add(m);
              T.selectableObjects.push(m);
            }
          }
          // 合并 logo
          groups.logos.forEach((lg: any) => {
            const merged = mergeGroupGeometries(lg, T.modelRoot);
            if (merged) {
              const m = new THREE.Mesh(merged.geometry, makeThemeMaterial('logo'));
              m.name = 'merged_' + lg.name;
              m.castShadow = true; m.receiveShadow = true;
              m.userData.themeApplied = true;
              T.modelRoot.remove(lg);
              T.modelRoot.add(m);
            }
          });

          // 为所有 mesh 统一应用主题材质 + 阴影设置
          T.modelRoot.traverse((child: any) => {
            if (child.isMesh && child.geometry) {
              child.castShadow = true;
              child.receiveShadow = true;
              ensureUV(child.geometry);
              // 非交互 mesh 统一主题材质；灯具/空调保留独立处理
              if (child.userData.deviceType !== 'light' && child.userData.deviceType !== 'ac' && !child.userData.themeApplied) {
                applyThemeMaterialToMesh(child, 'default');
                child.userData.themeApplied = true;
              }
              if (child.material) {
                child.userData.origEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0, 0, 0);
                child.userData.origEmissiveIntensity = child.material.emissiveIntensity || 0;
              }
            }
          });

          // 识别灯具（外壳科技色 + 灯罩暖白发光）
          T.lightFixtures = [];
          if (groups.light) {
            let idx = 0;
            groups.light.traverse((child: any) => {
              if (child.isMesh) {
                child.userData.deviceType = 'light';
                child.userData.deviceInfo = makeDeviceInfo(child, 'light', idx);
                applyThemeMaterialToMesh(child, 'light');
                child.userData.themeApplied = true;
                T.lightFixtures.push(child);
                T.selectableObjects.push(child);
                idx++;
              }
            });
          }
          // 识别空调（聚类）— 冷青蓝金属外壳
          T.acUnits = [];
          if (groups.ac) {
            const meshes: any[] = [];
            groups.ac.traverse((child: any) => { if (child.isMesh) meshes.push(child); });
            const clusters: any[] = [];
            const threshold = 1.5;
            const tmpBox = new THREE.Box3();
            const tmpC = new THREE.Vector3();
            meshes.forEach((mesh) => {
              tmpBox.setFromObject(mesh);
              tmpBox.getCenter(tmpC);
              let placed = false;
              for (const c of clusters) {
                if (tmpC.distanceTo(c.origin) < threshold) { c.meshes.push(mesh); placed = true; break; }
              }
              if (!placed) clusters.push({ origin: tmpC.clone(), meshes: [mesh] });
            });
            clusters.forEach((cluster, idx) => {
              const acInfo = makeDeviceInfo(cluster.meshes[0], 'ac', idx);
              cluster.meshes.forEach((m: any) => {
                m.userData.deviceType = 'ac';
                m.userData.deviceInfo = acInfo;
                m.userData.acIndex = idx;
                applyThemeMaterialToMesh(m, 'ac');
                m.userData.themeApplied = true;
                T.acUnits.push(m);
                T.selectableObjects.push(m);
              });
            });
          }

          setupPointLights(T);
          // 暴露 switchLightingMode 给 React 组件
          switchLightingModeRef.current = switchLightingMode;
          setupAirflow(T);
          // 地面平面已移除（用户要求去掉大平面正方形）
          // 空调脉冲标记光柱已移除（影响灯光选择和视觉）
          fitCameraToModel(T);
          // 初始化灯光模式（emissive 模式下隐藏 RectAreaLight 减少渲染开销）
          switchLightingMode(T, lightingModeRef.current);
          applyLighting(T);
          applyAC(T);
          buildDeviceList(T);
          updateStatus(T);
          // 默认显示能源总览模块，隐藏 3D 模型及灯光
          if (T.modelRoot) T.modelRoot.visible = false;
          T.rectLights?.forEach((l: any) => { l.visible = false; });
          T.deviceMarkers?.forEach((m: any) => { m.group.visible = false; });
          T.airflowSystems?.forEach((s: any) => { s.points.visible = false; });
          resolve();
        },
        (xhr: any) => {
          if (xhr.lengthComputable) {
            const pct = Math.round((xhr.loaded / xhr.total) * 100);
            setLoaderText(`加载 3D 模型... ${pct}%`);
            setLoaderPct(pct);
          }
        },
        (err: any) => { console.error('模型加载失败:', err); resolve(); }
        );
      });
    }

    function normalizeModel(model: any) {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 40 / maxDim;
      model.scale.setScalar(scale);
      const box2 = new THREE.Box3().setFromObject(model);
      const c2 = box2.getCenter(new THREE.Vector3());
      model.position.x -= c2.x;
      model.position.z -= c2.z;
      model.position.y -= box2.min.y;
    }

    function mergeGroupGeometries(groupNode: any, root: any) {
      if (!groupNode) return null;
      root.updateMatrixWorld(true);
      const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
      const geos: any[] = [];
      let refMat: any = null;
      const keep = ['position', 'normal', 'uv'];
      let meshCount = 0;
      groupNode.traverse((child: any) => {
        if (child.isMesh && child.geometry) {
          meshCount++;
          if (!refMat && child.material) refMat = child.material;
          const geo = child.geometry.clone();
          const localM = new THREE.Matrix4().multiplyMatrices(invRoot, child.matrixWorld);
          geo.applyMatrix4(localM);
          Object.keys(geo.attributes).forEach((k) => { if (!keep.includes(k)) geo.deleteAttribute(k); });
          ensureUV(geo);
          if (!geo.attributes.normal) geo.computeVertexNormals();
          geos.push(geo);
        }
      });
      if (geos.length === 0) return null;
      try { return { geometry: mergeGeometries(geos, false), material: refMat }; }
      catch { return null; }
    }

    function ensureUV(geo: any) {
      if (geo && !geo.attributes.uv) {
        const cnt = geo.attributes.position.count;
        geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(cnt * 2), 2));
      }
    }

    // ===== 科技主题材质（统一配色，保留细节） =====
    // 配色：深青蓝主体 + 金属质感，与 UI 青色主题呼应
    function makeThemeMaterial(type: 'wall' | 'furniture' | 'logo' | 'light' | 'ac' | 'default') {
      const presets: Record<string, any> = {
        // 墙体：白膜效果，纯白漫反射，干净有光影
        wall: { color: 0xe8eef5, metalness: 0.0, roughness: 0.85, emissive: 0x000000, emissiveIntensity: 0.0, envMapIntensity: 0.3 },
        // 桌椅：浅灰白，略带反射
        furniture: { color: 0xd8e0e8, metalness: 0.1, roughness: 0.7, emissive: 0x000000, emissiveIntensity: 0.0, envMapIntensity: 0.4 },
        // logo 装饰：亮青色，高金属反射
        logo: { color: 0x3a6a9a, metalness: 0.6, roughness: 0.3, emissive: 0x00d4ff, emissiveIntensity: 0.15, envMapIntensity: 1.0 },
        // 灯具：暖白发光灯罩 + 青色外壳
        light: { color: 0x4a6080, metalness: 0.5, roughness: 0.35, emissive: 0xffcc44, emissiveIntensity: 0.8, envMapIntensity: 0.8 },
        // 空调：冷青蓝金属，干净反光
        ac: { color: 0x4a8ab8, metalness: 0.7, roughness: 0.25, emissive: 0x103040, emissiveIntensity: 0.05, envMapIntensity: 1.0 },
        // 默认：白膜
        default: { color: 0xe0e6ed, metalness: 0.0, roughness: 0.8, emissive: 0x000000, emissiveIntensity: 0.0, envMapIntensity: 0.3 },
      };
      const p = presets[type] || presets.default;
      return new THREE.MeshStandardMaterial({
        color: p.color,
        metalness: p.metalness,
        roughness: p.roughness,
        emissive: p.emissive,
        emissiveIntensity: p.emissiveIntensity,
        envMapIntensity: p.envMapIntensity,
      });
    }

    // 为已存在的 mesh 应用主题材质（保留几何体）
    function applyThemeMaterialToMesh(mesh: any, type: 'wall' | 'furniture' | 'logo' | 'light' | 'ac' | 'default') {
      mesh.material = makeThemeMaterial(type);
    }

    function makeDeviceInfo(obj: any, type: string, index = 0) {
      const base = deviceDB[type] || deviceDB.default;
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const tnm: any = { light: '灯', ac: '空调', furniture: '家具', wall: '墙体' };
      return {
        ...base,
        name: `${tnm[type] || '设备'}-${String(index + 1).padStart(2, '0')}`,
        position: `${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)}`,
        size: `${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)}`,
        temp: type === 'ac' ? stateRef.current.ac.temperature + '°C' : '-',
        power: type === 'light' ? `${base.power}W` : type === 'ac' ? `${base.power}W` : '-'
      };
    }

    // ===== 灯具发光光源（真实顶点去重 + Z轴不取反，修正镜像问题）=====
    function setupPointLights(T: any) {
      T.modelRoot.updateMatrixWorld(true);
      T.scene.updateMatrixWorld(true);
      T.rectLights = [];
      T.rectHelpers = [];
      T.pointLights = [];
      T.shadowLights = [];

      // 获取模型整体 Y 中心，判断灯具是否在天花板
      const modelBox = new THREE.Box3().setFromObject(T.modelRoot);
      const modelCenterY = modelBox.getCenter(new THREE.Vector3()).y;

      T.lightFixtures.forEach((mesh: any, i: number) => {
        if (!mesh.geometry || !mesh.geometry.attributes.position) return;
        mesh.updateWorldMatrix(true, false);

        // === 1. 提取所有顶点的世界空间坐标 ===
        const posAttr = mesh.geometry.attributes.position;
        const rawWorldVerts: THREE.Vector3[] = [];
        for (let v = 0; v < posAttr.count; v++) {
          const localP = new THREE.Vector3().fromBufferAttribute(posAttr, v);
          const worldP = new THREE.Vector3().copy(localP).applyMatrix4(mesh.matrixWorld);
          rawWorldVerts.push(worldP);
        }

        // === 2. 找出4个真正的角点 ===
        // 模型灯具 geometry 有3种顶点数：
        //   4顶点（标准矩形，但可能在局部空间是旋转的，AABB不适用）
        //   6顶点（4角+2长边中点）
        //   9顶点（复杂结构）
        // 解决：用质心距离算法选4个最远点 = 4个角点
        const worldVerts: THREE.Vector3[] = [];
        // 先去重精确重复点
        const uniqueVerts: THREE.Vector3[] = [];
        const tol = 0.001;
        for (const v of rawWorldVerts) {
          let isDup = false;
          for (const e of uniqueVerts) {
            if (v.distanceTo(e) < tol) { isDup = true; break; }
          }
          if (!isDup) uniqueVerts.push(v);
        }
        if (uniqueVerts.length === 4) {
          worldVerts.push(...uniqueVerts);
        } else if (uniqueVerts.length > 4) {
          // 计算质心，按距离排序取最远4个（即4个角点）
          const centroid = new THREE.Vector3();
          uniqueVerts.forEach(v => centroid.add(v));
          centroid.divideScalar(uniqueVerts.length);
          const sorted = uniqueVerts.slice().sort((a, b) =>
            b.distanceTo(centroid) - a.distanceTo(centroid)
          );
          worldVerts.push(...sorted.slice(0, 4));
        } else {
          return; // 少于4个顶点，跳过
        }
        if (worldVerts.length !== 4) return;

        // === 3. 计算中心点 ===
        const center = new THREE.Vector3();
        worldVerts.forEach(v => center.add(v));
        center.divideScalar(4);

        // === 4. 精确找出长边和短边（避开"对角线陷阱"） ===
        const pairs = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
        const dists = pairs.map((p, idx) => ({
          idx, dist: worldVerts[p[0]].distanceTo(worldVerts[p[1]])
        }));
        dists.sort((a, b) => a.dist - b.dist);

        // 排序后：[短边, 短边, 长边, 长边, 对角线, 对角线]
        const shortPair = pairs[dists[0].idx];
        const longPair = pairs[dists[2].idx];

        const width = dists[2].dist;  // 长边（RectAreaLight的宽）
        const height = dists[0].dist; // 短边（RectAreaLight的高）

        const longDir = new THREE.Vector3().subVectors(worldVerts[longPair[1]], worldVerts[longPair[0]]).normalize();
        let shortDir = new THREE.Vector3().subVectors(worldVerts[shortPair[1]], worldVerts[shortPair[0]]).normalize();
        let normal = new THREE.Vector3().crossVectors(longDir, shortDir).normalize();

        // 保证右手坐标系：longDir × shortDir 应该 = normal
        const crossCheck = new THREE.Vector3().crossVectors(longDir, shortDir);
        if (crossCheck.dot(normal) < 0) {
          shortDir.negate();
          normal = new THREE.Vector3().crossVectors(longDir, shortDir).normalize();
        }

        // === 5. 法线方向修正：强制法线朝上（指向天花板 +Y）===
        // RectAreaLight 默认沿 -Z 方向发光
        // 如果 Z = 法线（朝上 +Y），则 -Z = -法线（朝下 -Y），光自然射向地面
        // 所以需要保证法线 Y 分量 > 0（朝向天花板）
        let finalNormal = normal;
        if (finalNormal.y < 0) {
          finalNormal = finalNormal.clone().negate();
          // 翻转法线后需要重新计算 shortDir 保持右手坐标系
          shortDir = new THREE.Vector3().crossVectors(finalNormal, longDir).normalize();
          const check2 = new THREE.Vector3().crossVectors(longDir, shortDir);
          if (check2.dot(finalNormal) < 0) shortDir.negate();
        }

        // === 6. 核心修正：Z 轴 = 法线（朝上），永不反转！ ===
        // Z = finalNormal（朝上 +Y）
        // -Z = -finalNormal（朝下 -Y）= 光的发射方向，自然射向地面
        // 不取反 Z，保持右手坐标系，避免镜像翻转
        const Z = finalNormal;
        const X = longDir;
        const Y = shortDir;

        const rotMatrix = new THREE.Matrix4().makeBasis(X, Y, Z);
        const worldQuat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);

        // === 7. 创建 RectAreaLight（恢复到原位置 = 灯具中心）===
        const rectLight = new THREE.RectAreaLight(0xff4400, 0, width, height);  // 深桔红色（颜色更深）
        rectLight.position.copy(center);
        rectLight.quaternion.copy(worldQuat);
        rectLight.name = `__rectLight_${i}`;
        T.scene.add(rectLight);
        T.rectLights.push(rectLight);

        // === 8. 灯具模型可见性根据灯光模式决定 ===
        // emissive 模式：显示灯具模型 + 发光材质（性能好）
        // rect 模式：隐藏灯具模型（用 RectAreaLight 真实照明）
        if (lightingModeRef.current === 'emissive') {
          mesh.visible = true;
          // 亮灯=橘红整块，关灯=灰色整块（不用渐变，不用透明度避免黑边）
          // 使用 MeshBasicMaterial（性能最优，无光照计算）
          (mesh as any).material = new (THREE as any).MeshBasicMaterial({
            color: 0xff4400,    // 橘红色（亮灯）
            side: THREE.FrontSide,  // 单面渲染，避免双面黑边
            transparent: false,
            opacity: 1.0,
          });
        } else {
          mesh.visible = false;
        }
      });

      T.rectHelpers = []; // 不再创建 Helper
      console.log(`灯具光源: ${T.rectLights.length} 个 (模式: ${lightingModeRef.current})`);
    }

    // ===== 切换灯光模式（发光材质 vs RectAreaLight）=====
    function switchLightingMode(T: any, mode: 'rect' | 'emissive') {
      lightingModeRef.current = mode;
      const b = stateRef.current.lighting.brightness;
      const enabled = stateRef.current.lighting.enabled;

      if (mode === 'emissive') {
        // 方案A：发光材质模式（性能好，低配置友好）
        // 1. 隐藏所有 RectAreaLight
        T.rectLights?.forEach((light: any) => {
          light.intensity = 0;
          light.visible = false;
        });
        // 2. 显示灯具模型 + 颜色从橘红→灰色过渡
        const colorOn = new THREE.Color(0xff4400);
        const colorOff = new THREE.Color(0x555555);
        const tmpColor = new THREE.Color();
        T.lightFixtures?.forEach((mesh: any) => {
          mesh.visible = true;
          if (mesh.material) {
            if (enabled) {
              tmpColor.lerpColors(colorOff, colorOn, b);
            } else {
              tmpColor.copy(colorOff);
            }
            mesh.material.color = tmpColor.clone();
          }
        });
      } else {
        // 方案B：RectAreaLight 真实照明模式（效果好，性能要求高）
        // 1. 显示 RectAreaLight
        T.rectLights?.forEach((light: any) => { light.visible = true; });
        // 2. 隐藏灯具模型
        T.lightFixtures?.forEach((mesh: any) => { mesh.visible = false; });
        // 2. 开启 RectAreaLight
        T.rectLights?.forEach((light: any, i: number) => {
          const fixture = T.lightFixtures[i];
          const indOn = fixture?.userData?.individualOn;
          const finalOn = enabled && (indOn !== false);
          light.intensity = finalOn ? b * 22.5 : 0;
        });
      }
    }

    function farthestPointSampling(points: any[], n: number) {
      if (points.length <= n) return points.slice();
      const result = [points[0]];
      const remaining = points.slice(1);
      while (result.length < n && remaining.length > 0) {
        let maxD = -1, maxI = 0;
        for (let i = 0; i < remaining.length; i++) {
          let minD = Infinity;
          for (const r of result) { const d = remaining[i].distanceTo(r); if (d < minD) minD = d; }
          if (minD > maxD) { maxD = minD; maxI = i; }
        }
        result.push(remaining[maxI]);
        remaining.splice(maxI, 1);
      }
      return result;
    }

    function setupAirflow(T: any) {
      T.airflowSystems = [];
      const groupMap = new Map();
      T.acUnits.forEach((mesh: any) => {
        const idx = mesh.userData.acIndex ?? 0;
        if (!groupMap.has(idx)) groupMap.set(idx, []);
        groupMap.get(idx).push(mesh);
      });
      groupMap.forEach((meshes: any, idx: number) => {
        const box = new THREE.Box3();
        meshes.forEach((m: any) => box.expandByObject(m));
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const sys = createAirflowSystem(center, size, idx);
        T.airflowSystems.push(sys);
        T.scene.add(sys.points);
      });
    }

    function createAirflowSystem(center: any, size: any, index: number) {
      const count = 50;
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      const ages = new Float32Array(count);
      const lifetimes = new Float32Array(count);
      for (let i = 0; i < count; i++) resetAirflow(positions, velocities, ages, lifetimes, i, center, size);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const tex = createCircleTexture();
      const mat = new THREE.PointsMaterial({ color: 0x88ccff, size: 0.35, map: tex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
      const points = new THREE.Points(geo, mat);
      points.userData = { center: center.clone(), size: size.clone(), velocities, ages, lifetimes, acIndex: index };
      return { points, mat };
    }

    function resetAirflow(pos: any, vel: any, ages: any, lifetimes: any, i: number, center: any, size: any) {
      pos[i * 3] = center.x + (Math.random() - 0.5) * size.x * 0.8;
      pos[i * 3 + 1] = center.y;
      pos[i * 3 + 2] = center.z + (Math.random() - 0.5) * size.z * 0.8;
      const angle = Math.random() * Math.PI * 2;
      const spread = 0.3 + Math.random() * 0.4;
      vel[i * 3] = Math.cos(angle) * spread;
      vel[i * 3 + 1] = -(0.6 + Math.random() * 0.8);
      vel[i * 3 + 2] = Math.sin(angle) * spread;
      ages[i] = 0;
      lifetimes[i] = 2.5 + Math.random() * 2;
    }

    function createCircleTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(canvas);
    }

    function setupGround(T: any) {
      const box = new THREE.Box3().setFromObject(T.modelRoot);
      const size = box.getSize(new THREE.Vector3());
      const gs = Math.max(size.x, size.z) * 1.8;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(gs, gs), new THREE.MeshStandardMaterial({ color: 0x0a1428, roughness: 0.6, metalness: 0.4, transparent: true, opacity: 0.85 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.02;
      floor.receiveShadow = true;
      T.scene.add(floor);
      const grid = new THREE.GridHelper(gs, 40, 0x00d4ff, 0x0a3050);
      (grid.material as any).transparent = true;
      (grid.material as any).opacity = 0.25;
      grid.position.y = -0.01;
      T.scene.add(grid);
      const ringGeo = new THREE.RingGeometry(gs * 0.45, gs * 0.46, 64);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      T.scene.add(ring);
    }

    function setupDeviceMarkers(T: any) {
      T.deviceMarkers = [];
      const acClusters = new Map();
      T.acUnits.forEach((mesh: any) => {
        const idx = mesh.userData.acIndex ?? 0;
        if (!acClusters.has(idx)) {
          const box = new THREE.Box3().setFromObject(mesh);
          acClusters.set(idx, box.getCenter(new THREE.Vector3()));
        }
      });
      acClusters.forEach((center: any) => {
        const m = createPulseMarker(center, 0x64c8ff);
        T.deviceMarkers.push(m);
        T.scene.add(m.group);
      });
    }

    function createPulseMarker(pos: any, color: number) {
      const group = new THREE.Group();
      group.position.copy(pos);
      group.position.y = 0.02;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.5, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.15, 3, 8, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
      beam.position.y = 1.5;
      group.add(beam);
      return { group, ring, beam, phase: Math.random() * Math.PI * 2 };
    }

    function fitCameraToModel(T: any) {
      const box = new THREE.Box3().setFromObject(T.modelRoot);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = T.camera.fov * Math.PI / 180;
      // 计算视窗宽高比，适配横屏大屏
      const aspect = window.innerWidth / window.innerHeight;
      // 水平 FOV（根据垂直 FOV 和宽高比换算）
      const fovH = 2 * Math.atan(Math.tan(fov / 2) * aspect);
      // 取垂直和水平方向所需距离的较小值，确保模型完全可见且尽量充满视窗
      const distV = Math.abs(size.y / 2 / Math.tan(fov / 2));
      const distH = Math.abs(size.x / 2 / Math.tan(fovH / 2));
      let dist = Math.max(distV, distH);
      dist *= 1.08; // 留少量边距，模型尽量充满视窗
      T.camera.position.set(center.x + dist * 0.7, center.y + dist * 0.45, center.z + dist * 0.9);
      T.camera.lookAt(center);
      T.controls.target.set(center.x, center.y, center.z);
      T.controls.update();
    }

    // ===== 交互 =====
    const raycaster = new THREE.Raycaster();
    function getMouseNDC(e: any) {
      const rect = T.renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    }
    function onResize() {
      T.camera.aspect = window.innerWidth / window.innerHeight;
      T.camera.updateProjectionMatrix();
      T.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    function onPointerMove(e: any) {
      const mouse = getMouseNDC(e);
      raycaster.setFromCamera(mouse, T.camera);
      const hits = raycaster.intersectObjects(T.selectableObjects, false);
      T.renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    }
    function onPointerClick(e: any) {
      const mouse = getMouseNDC(e);
      raycaster.setFromCamera(mouse, T.camera);
      const hits = raycaster.intersectObjects(T.selectableObjects, false);
      if (hits.length > 0) {
        const obj = findSelectableRoot(hits[0].object);
        if (T.selectedObject === obj) deselectObject();
        else { deselectObject(); selectObject(obj); }
      } else deselectObject();
    }
    function onDoubleClick(e: any) {
      const mouse = getMouseNDC(e);
      raycaster.setFromCamera(mouse, T.camera);
      const hits = raycaster.intersectObjects(T.selectableObjects, false);
      if (hits.length > 0) {
        const obj = findSelectableRoot(hits[0].object);
        focusOnObject(obj);
        selectObject(obj);
      }
    }
    function findSelectableRoot(obj: any) {
      let cur = obj;
      // 向上遍历找到有 deviceInfo 或 deviceType 的节点（整个灯具/空调模型）
      while (cur) {
        if (cur.userData.deviceInfo && cur.userData.deviceInfo.name) return cur;
        if (cur.userData.deviceType) return cur;
        cur = cur.parent;
      }
      return obj;
    }
    function selectObject(obj: any) {
      T.selectedObject = obj;
      obj.traverseVisible((child: any) => {
        if (child.isMesh && child.material) {
          child.userData._hlEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color();
          child.userData._hlIntensity = child.material.emissiveIntensity || 0;
          child.material.emissive = new THREE.Color(0x00d4ff);
          child.material.emissiveIntensity = 0.7;
        }
      });
      // 记录灯具在 lightFixtures/rectLights 中的索引（用于单灯开关）
      let lightIdx = -1;
      if (obj.userData.deviceType === 'light') {
        lightIdx = T.lightFixtures.indexOf(obj);
      }
      // 读取单灯开关状态（默认跟随全局照明状态）
      const individualOn = obj.userData.individualOn ?? stateRef.current.lighting.enabled;
      obj.userData.individualOn = individualOn;
      setSelectedDevice({ obj, info: obj.userData.deviceInfo, type: obj.userData.deviceType, lightIdx, individualOn });
      // 高亮列表项
      const idx = deviceListRef.current.findIndex((it: any) => it.obj === obj);
      setActiveDeviceIdx(idx);
      showToast(`已选中: ${obj.userData.deviceInfo?.name || '设备'}`);
    }
    function deselectObject() {
      if (T.selectedObject) {
        T.selectedObject.traverseVisible((child: any) => {
          if (child.isMesh && child.material && child.userData._hlEmissive !== undefined) {
            child.material.emissive = child.userData._hlEmissive;
            child.material.emissiveIntensity = child.userData._hlIntensity;
            delete child.userData._hlEmissive;
            delete child.userData._hlIntensity;
          }
        });
        T.selectedObject = null;
      }
      setSelectedDevice(null);
      setActiveDeviceIdx(-1);
    }
    function focusOnObject(obj: any) {
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 2);
      const dist = maxDim * 3 + 3;
      const dir = new THREE.Vector3(0.8, 0.5, 0.9).normalize();
      T.cameraTween = { startPos: T.camera.position.clone(), endPos: center.clone().add(dir.multiplyScalar(dist)), startTarget: T.controls.target.clone(), endTarget: center.clone(), time: 0, duration: 0.9 };
    }

    // ===== 状态应用 =====
    function applyLighting(T: any) {
      const s = stateRef.current.lighting;
      const b = s.brightness;
      const mode = lightingModeRef.current;

      // 方案A：发光材质模式 - 灯具模型自发光（性能好）
      if (mode === 'emissive') {
        // 颜色从橘红(亮度100%)→灰色(亮度0%)过渡
        const colorOn = new THREE.Color(0xff4400);  // 橘红
        const colorOff = new THREE.Color(0x555555); // 灰色
        const tmpColor = new THREE.Color();
        T.lightFixtures?.forEach((mesh: any) => {
          if (mesh.material) {
            const indOn = mesh.userData?.individualOn;
            const finalOn = s.enabled && (indOn !== false);
            // 亮度调节 = 颜色从橘红(b=1)到灰色(b=0)过渡
            if (finalOn) {
              tmpColor.lerpColors(colorOff, colorOn, b);
            } else {
              tmpColor.copy(colorOff);
            }
            mesh.material.color = tmpColor.clone();
          }
        });
        // 关闭并隐藏 RectAreaLight（emissive 模式不用，减少渲染开销）
        T.rectLights?.forEach((light: any) => { light.intensity = 0; light.visible = false; });
      } else {
        // 方案B：RectAreaLight 真实照明模式（效果好）
        T.rectLights.forEach((light: any, i: number) => {
          const fixture = T.lightFixtures[i];
          const indOn = fixture?.userData?.individualOn;
          const finalOn = s.enabled && (indOn !== false);
          light.intensity = finalOn ? b * 22.5 : 0;
        });
      }
      // 关灯时：所有 mesh 的自发光归零（墙/桌椅/logo/空调等），避免残余亮度
      T.modelRoot.traverse((child: any) => {
        if (child.isMesh && child.material && !child.userData._hlEmissive) {
          child.userData._origEmissiveInt = child.userData._origEmissiveInt ?? child.material.emissiveIntensity;
          child.material.emissiveIntensity = s.enabled ? child.userData._origEmissiveInt : 0;
        }
      });
      // 关灯时隐藏空调脉冲标记光柱（避免蓝色光柱干扰）
      if (T.deviceMarkers) {
        T.deviceMarkers.forEach((m: any) => { m.group.visible = s.enabled; });
      }
      // RectAreaLightHelper 始终显示（用于检查位置），不随开关灯变化
      // 关灯时：所有光源全部归零，空间完全变黑
      const ambient = T.scene.getObjectByName('__ambient');
      if (ambient) ambient.intensity = s.enabled ? 0.4 : 0;
      const hemi = T.scene.getObjectByName('__hemi');
      if (hemi) hemi.intensity = s.enabled ? 0.35 : 0;
      const dirLight = T.scene.getObjectByName('__directional');
      if (dirLight) dirLight.intensity = s.enabled ? 0.8 : 0;
      // HDR 环境贴图强度归零，关灯时移除环境贴图避免残余反射
      if (T.scene.environmentIntensity !== undefined) {
        T.scene.environmentIntensity = s.enabled ? 0.4 : 0;
      }
      if (!s.enabled) {
        T.scene.environment = null;
      } else if (T.envTexture && !T.scene.environment) {
        T.scene.environment = T.envTexture;
      }
      // 曝光：关灯时极低
      T.renderer.toneMappingExposure = s.enabled ? 1.0 + b * 0.2 : 0.1;
      updateStatus(T);
    }

    function applyAC(T: any) {
      const s = stateRef.current.ac;
      T.airflowSystems.forEach((sys: any) => { sys.mat.opacity = s.enabled ? 0.55 : 0; sys.mat.visible = s.enabled; });
      const t = (s.temperature - 16) / 14;
      let fogColor, ambientColor, particleColor;
      if (t < 0.4) {
        const k = (0.4 - t) / 0.4;
        fogColor = new THREE.Color(0x06081a).lerp(new THREE.Color(0x0a1428), k);
        ambientColor = new THREE.Color(0x6688aa).lerp(new THREE.Color(0x4466aa), k * 0.5);
        particleColor = new THREE.Color(0x88ccff).lerp(new THREE.Color(0x44aaff), k * 0.5);
      } else if (t > 0.6) {
        const k = (t - 0.6) / 0.4;
        fogColor = new THREE.Color(0x06081a).lerp(new THREE.Color(0x1a1008), k);
        ambientColor = new THREE.Color(0x6688aa).lerp(new THREE.Color(0xaa8866), k * 0.5);
        particleColor = new THREE.Color(0x88ccff).lerp(new THREE.Color(0xffaa66), k * 0.6);
      } else {
        fogColor = new THREE.Color(0x06081a);
        ambientColor = new THREE.Color(0x6688aa);
        particleColor = new THREE.Color(0x88ccff);
      }
      if (s.enabled) { T.scene.fog.color = fogColor; }
      else { T.scene.fog.color = new THREE.Color(0x0a1228); }
      // 背景色保持统一深蓝（不随空调温度变化，避免暗灰蓝色调）
      T.scene.background = new THREE.Color(0x0a1228);
      const ambient = T.scene.getObjectByName('__ambient');
      if (ambient && stateRef.current.lighting.enabled) ambient.color = s.enabled ? ambientColor : new THREE.Color(0x6688aa);
      T.airflowSystems.forEach((sys: any) => { sys.mat.color = s.enabled ? particleColor : sys.mat.color; });
      T.acUnits.forEach((mesh: any) => { if (mesh.userData.deviceInfo) mesh.userData.deviceInfo.temp = s.enabled ? `${s.temperature}°C` : '待机'; });
      if (T.selectedObject && T.selectedObject.userData.deviceType === 'ac') {
        setSelectedDevice({ obj: T.selectedObject, info: T.selectedObject.userData.deviceInfo, type: 'ac' });
      }
      updateStatus(T);
    }

    // ===== 设备列表 =====
    function buildDeviceList(T: any) {
      const items: DeviceListItem[] = [];
      const lightNames = new Set();
      T.lightFixtures.forEach((m: any) => {
        const name = m.userData.deviceInfo?.name;
        if (name && !lightNames.has(name)) { lightNames.add(name); items.push({ name, type: 'light', meta: `${deviceDB.light.power}W · ${deviceDB.light.colorTemp}`, obj: m }); }
      });
      const acNames = new Map();
      T.acUnits.forEach((m: any) => {
        const name = m.userData.deviceInfo?.name;
        if (name && !acNames.has(name)) { acNames.set(name, m); items.push({ name, type: 'ac', meta: `${deviceDB.ac.power}W · ${stateRef.current.ac.temperature}°C`, obj: m }); }
      });
      setDeviceList(items);
      deviceListRef.current = items;
    }

    // ===== 状态栏 + KPI =====
    function updateStatus(T: any) {
      const lightCount = T.lightFixtures ? new Set(T.lightFixtures.map((m: any) => m.userData.deviceInfo?.name)).size : 0;
      const acCount = T.acUnits ? new Set(T.acUnits.map((m: any) => m.userData.acIndex)).size : 0;
      const total = lightCount + acCount;
      const active = (stateRef.current.lighting.enabled ? lightCount : 0) + (stateRef.current.ac.enabled ? acCount : 0);
      const lightPower = stateRef.current.lighting.enabled ? lightCount * deviceDB.light.power : 0;
      const acPower = stateRef.current.ac.enabled ? acCount * deviceDB.ac.power : 0;
      const totalPower = (lightPower + acPower) / 1000;
      T._status = { total, active, totalPower };
      setKpiPower(totalPower.toFixed(1));
      const tv = (Math.random() * 10 - 3).toFixed(1);
      setKpiTrend({ val: (parseFloat(tv) >= 0 ? '+' : '') + tv + '%', up: parseFloat(tv) >= 0 });
      setEnergyTag(totalPower > 8 ? 'HIGH' : 'NORMAL');
      setEnergyTagWarn(totalPower > 8);
    }

    // ===== 动画 =====
    let fpsCounter = { frames: 0, lastTime: performance.now() };
    let frameCount = 0;
    function animate() {
      if (disposed) return;
      T.rafId = requestAnimationFrame(animate);
      const delta = T.clock.getDelta();
      frameCount++;

      // 相机缓动
      if (T.cameraTween) {
        T.cameraTween.time += delta;
        const t = Math.min(T.cameraTween.time / T.cameraTween.duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        T.camera.position.lerpVectors(T.cameraTween.startPos, T.cameraTween.endPos, eased);
        T.controls.target.lerpVectors(T.cameraTween.startTarget, T.cameraTween.endTarget, eased);
        if (t >= 1) T.cameraTween = null;
      }
      T.controls.update();

      // 性能优化：设备标记脉冲动画降频（每3帧更新一次）
      if (T.deviceMarkers && frameCount % 3 === 0) {
        const time = T.clock.elapsedTime;
        T.deviceMarkers.forEach((m: any) => {
          const pulse = 0.5 + 0.5 * Math.sin(time * 2 + m.phase);
          m.ring.scale.setScalar(0.8 + pulse * 0.6);
          m.ring.material.opacity = 0.6 * (1 - pulse * 0.5);
          m.beam.material.opacity = 0.15 + pulse * 0.25;
        });
      }

      // 性能优化：气流粒子动画降频（每2帧更新一次）
      if (stateRef.current.ac.enabled && T.airflowSystems && frameCount % 2 === 0) {
        updateAirflow(T, delta * 2);
      }

      // FPS 计数
      fpsCounter.frames++;
      const now = performance.now();
      if (now - fpsCounter.lastTime >= 1000) {
        const fpsVal = Math.round((fpsCounter.frames * 1000) / (now - fpsCounter.lastTime));
        fpsCounter.frames = 0;
        fpsCounter.lastTime = now;
        const fpsEl = document.getElementById('fps-value');
        if (fpsEl) fpsEl.textContent = String(fpsVal);
      }
      // 直接渲染
      T.renderer.render(T.scene, T.camera);
    }

    function updateAirflow(T: any, delta: number) {
      T.airflowSystems.forEach((sys: any) => {
        const points = sys.points;
        const pos = points.geometry.attributes.position.array;
        const vel = points.userData.velocities;
        const ages = points.userData.ages;
        const lifetimes = points.userData.lifetimes;
        const center = points.userData.center;
        const size = points.userData.size;
        for (let i = 0; i < pos.length / 3; i++) {
          ages[i] += delta;
          if (ages[i] > lifetimes[i] || pos[i * 3 + 1] < 0) { resetAirflow(pos, vel, ages, lifetimes, i, center, size); continue; }
          pos[i * 3] += vel[i * 3] * delta;
          pos[i * 3 + 1] += vel[i * 3 + 1] * delta;
          pos[i * 3 + 2] += vel[i * 3 + 2] * delta;
          vel[i * 3 + 1] += 0.3 * delta;
          vel[i * 3] *= 1.02;
          vel[i * 3 + 2] *= 1.02;
        }
        points.geometry.attributes.position.needsUpdate = true;
      });
    }

    // 初始化 selectableObjects
    T.selectableObjects = [];

    init().catch((e) => { console.error('初始化失败:', e); setLoaderText('初始化失败: ' + e.message); });

    return () => {
      disposed = true;
      if (T.rafId) cancelAnimationFrame(T.rafId);
      window.removeEventListener('resize', onResize);
      if (T.renderer) {
        T.renderer.domElement.removeEventListener('pointermove', onPointerMove);
        T.renderer.domElement.removeEventListener('click', onPointerClick);
        T.renderer.domElement.removeEventListener('dblclick', onDoubleClick);
        T.renderer.dispose();
        if (containerRef.current && T.renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(T.renderer.domElement);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refs 同步状态给 Three.js 闭包
  const stateRef = useRef({ lighting: { enabled: true, brightness: 0.8 }, ac: { enabled: true, temperature: 24 }, autoRotate: false });
  const renderModeRef = useRef('WebGPU');
  const lightingModeRef = useRef<'rect' | 'emissive'>('emissive');
  const switchLightingModeRef = useRef<((T: any, mode: 'rect' | 'emissive') => void) | null>(null);
  const deviceListRef = useRef<DeviceListItem[]>([]);
  useEffect(() => { renderModeRef.current = renderMode; }, [renderMode]);
  useEffect(() => { lightingModeRef.current = lightingMode; }, [lightingMode]);
  useEffect(() => { stateRef.current.lighting.enabled = lightingOn; stateRef.current.lighting.brightness = brightness / 100; }, [lightingOn, brightness]);
  useEffect(() => { stateRef.current.ac.enabled = acOn; stateRef.current.ac.temperature = temperature; }, [acOn, temperature]);

  // 时钟/日期
  useEffect(() => {
    const upd = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
      setDate(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
    };
    upd();
    const iv = setInterval(upd, 1000);
    return () => clearInterval(iv);
  }, []);

  // 告警模拟
  useEffect(() => {
    if (!threeRef.current.lightFixtures) return;
    const T = threeRef.current;
    const pushAlert = (type: AlertItem['type'], msg: string) => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      setAlerts((prev) => [{ type, msg, time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` }, ...prev].slice(0, 20));
    };
    pushAlert('info', '数字孪生系统已上线');
    pushAlert('info', `场景加载完成，识别 ${T.lightFixtures?.length || 0} 个灯具`);
    const tpls = [
      { type: 'info' as const, msg: '照明系统状态切换' },
      { type: 'info' as const, msg: '空调温度已调整' },
      { type: 'warning' as const, msg: '灯-28 功率波动检测，建议巡检' },
      { type: 'danger' as const, msg: '空调-07 通讯超时，已自动重连' },
      { type: 'info' as const, msg: '环境照度恢复至 500lx 以上' },
      { type: 'warning' as const, msg: 'CO₂ 浓度接近预警阈值 600ppm' },
    ];
    const iv = setInterval(() => { const t = tpls[Math.floor(Math.random() * tpls.length)]; pushAlert(t.type, t.msg); }, 8000);
    return () => clearInterval(iv);
  }, [loading]);

  // 在线人数模拟
  useEffect(() => {
    if (loading) return;
    let p = 30 + Math.floor(Math.random() * 40);
    setOnlinePeople(p);
    const iv = setInterval(() => { p += Math.floor(Math.random() * 7) - 3; p = Math.max(15, Math.min(95, p)); setOnlinePeople(p); }, 5000);
    return () => clearInterval(iv);
  }, [loading]);

  // 能耗折线图
  useEffect(() => {
    if (loading) return;
    powerHistoryRef.current = Array.from({ length: 30 }, () => 20 + Math.random() * 15);
    const draw = () => {
      const canvas = powerChartRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const h = powerHistoryRef.current;
      if (h.length < 2) return;
      const max = Math.max(...h) * 1.1, min = Math.min(...h) * 0.9, range = max - min || 1;
      const stepX = W / 29;
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
      grad.addColorStop(1, 'rgba(0, 212, 255, 0)');
      ctx.beginPath();
      ctx.moveTo(0, H);
      h.forEach((v, i) => { ctx.lineTo(i * stepX, H - ((v - min) / range) * H); });
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      h.forEach((v, i) => { const x = i * stepX, y = H - ((v - min) / range) * H; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 6;
      ctx.stroke();
      const lx = (h.length - 1) * stepX, ly = H - ((h[h.length - 1] - min) / range) * H;
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffcc';
      ctx.shadowColor = '#00ffcc';
      ctx.fill();
    };
    draw();
    const iv = setInterval(() => {
      const tp = parseFloat(kpiPower) || 0;
      powerHistoryRef.current.push(tp + (Math.random() - 0.5) * 3);
      if (powerHistoryRef.current.length > 30) powerHistoryRef.current.shift();
      draw();
    }, 3000);
    return () => clearInterval(iv);
  }, [loading, kpiPower]);

  // Toast
  function showToast(msg: string) {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 2000);
  }

  // UI 事件处理
  const onLightingToggle = () => {
    const v = !lightingOn; setLightingOn(v);
    const T = threeRef.current;
    if (T.rectLights) { applyLightingClosure(T, v, brightness / 100); }
    setShowList(true);
    showToast(v ? '照明系统已开启' : '照明系统已关闭');
    pushAlertUI(v ? 'info' : 'warning', `照明系统已${v ? '开启' : '关闭'}`);
  };
  const onBrightness = (e: any) => { const v = parseInt(e.target.value); setBrightness(v); const T = threeRef.current; if (T.rectLights) applyLightingClosure(T, lightingOn, v / 100); };
  const onAcToggle = () => {
    const v = !acOn; setAcOn(v);
    const T = threeRef.current;
    if (T.airflowSystems) applyACClosure(T, v, temperature);
    setShowList(true);
    showToast(v ? '空调系统已开启' : '空调系统已关闭');
    pushAlertUI(v ? 'info' : 'warning', `空调系统已${v ? '开启' : '关闭'}`);
  };
  const onTemperature = (e: any) => { const v = parseInt(e.target.value); setTemperature(v); const T = threeRef.current; if (T.airflowSystems) applyACClosure(T, acOn, v); };
  const onAutoRotate = () => { const v = !autoRotate; setAutoRotate(v); const T = threeRef.current; if (T.controls) { T.controls.autoRotate = v; T.controls.autoRotateSpeed = 0.8; } showToast(v ? '自动旋转已开启' : '自动旋转已关闭'); };
  const onResetView = () => { const T = threeRef.current; if (T.initialCamera) { T.cameraTween = { startPos: T.camera.position.clone(), endPos: T.initialCamera.pos.clone(), startTarget: T.controls.target.clone(), endTarget: T.initialCamera.target.clone(), time: 0, duration: 0.8 }; showToast('视角已重置'); } };
  const onTopView = () => { const T = threeRef.current; if (T.modelRoot) { const box = new THREE.Box3().setFromObject(T.modelRoot); const c = box.getCenter(new THREE.Vector3()); const s = box.getSize(new THREE.Vector3()); const d = Math.max(s.x, s.z) * 1.1; T.cameraTween = { startPos: T.camera.position.clone(), endPos: new THREE.Vector3(c.x, c.y + d, c.z + 0.01), startTarget: T.controls.target.clone(), endTarget: c.clone(), time: 0, duration: 0.8 }; showToast('已切换至俯视视角'); } };
  const onToggleList = () => { setShowList(!showList); if (!showList) { const T = threeRef.current; if (T.selectedObject) deselectClosure(T); } };

  // 楼层选择
  const onFloorSelect = (floor: number) => {
    setActiveFloor(floor);
    const T = threeRef.current;
    if (!T.modelRoot) return;
    if (floor === 0) { T.fitCameraToModel?.(T); showToast('已切换至整栋楼视图'); }
    else {
      const box = new THREE.Box3().setFromObject(T.modelRoot);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const floorY = box.min.y + size.y / 16 * (16 - floor + 0.5);
      T.cameraTween = { startPos: T.camera.position.clone(), endPos: new THREE.Vector3(center.x + 15, floorY + 5, center.z + 18), startTarget: T.controls.target.clone(), endTarget: new THREE.Vector3(center.x, floorY, center.z), time: 0, duration: 0.8 };
      showToast(`已切换至 ${floor}F 楼层视图`);
    }
  };
  const floorBtnStyle = (active: boolean): React.CSSProperties => ({ padding: '6px 4px', fontSize: '11px', fontWeight: 600, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border-line)'), background: active ? 'var(--primary-bg)' : 'transparent', color: active ? 'var(--primary)' : 'var(--text-mid)', borderRadius: '3px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: active ? '0 0 8px rgba(0,212,255,0.3)' : 'none', textAlign: 'center' as const });

  // 模块切换
  const onSwitchModule = (mod: 'overview' | 'overview2' | 'building' | 'solar' | 'charging' | 'carbon' | 'load' | 'grid') => {
    setActiveModule(mod);
    // 切换模块时隐藏设备详情面板
    setSelectedDevice(null);
    const T = threeRef.current;
    if (!T.scene) return;
    if (T.modelRoot) T.modelRoot.visible = (mod === 'building');
    // rect 模式下才显示 RectAreaLight，emissive 模式下保持隐藏
    T.rectLights?.forEach((l: any) => { l.visible = (mod === 'building') && (lightingModeRef.current === 'rect'); });
    T.rectHelpers?.forEach((h: any) => { if (h) h.visible = (mod === 'building'); });
    T.deviceMarkers?.forEach((m: any) => { m.group.visible = (mod === 'building'); });
    T.airflowSystems?.forEach((s: any) => { s.points.visible = (mod === 'building'); });
    if (mod === 'building') { T.fitCameraToModel?.(T); showToast('已切换至节能管理'); }
    else { showToast('已切换至' + (mod === 'overview' ? '总览2' : mod === 'overview2' ? '全景总览' : mod === 'solar' ? '光伏发电' : mod === 'charging' ? '充电桩' : mod === 'load' ? '负荷管理' : mod === 'grid' ? '配网管理' : '碳监测')); }
  };

  // 闭包版状态应用（避免依赖 effect 内函数）
  function applyLightingClosure(T: any, enabled: boolean, b: number) {
    stateRef.current.lighting.enabled = enabled;
    stateRef.current.lighting.brightness = b;
    const mode = lightingModeRef.current;

    // 方案A：发光材质模式 - 灯具模型自发光（性能好）
    if (mode === 'emissive') {
      // 颜色从橘红(亮度100%)→灰色(亮度0%)过渡
      const colorOn = new THREE.Color(0xff4400);
      const colorOff = new THREE.Color(0x555555);
      const tmpColor = new THREE.Color();
      T.lightFixtures?.forEach((mesh: any) => {
        if (mesh.material) {
          const indOn = mesh.userData?.individualOn;
          const finalOn = enabled && (indOn !== false);
          if (finalOn) {
            tmpColor.lerpColors(colorOff, colorOn, b);
          } else {
            tmpColor.copy(colorOff);
          }
          mesh.material.color = tmpColor.clone();
        }
      });
      T.rectLights?.forEach((light: any) => { light.intensity = 0; light.visible = false; });
    } else {
      // 方案B：RectAreaLight 真实照明模式
      T.rectLights.forEach((light: any, i: number) => {
        const fixture = T.lightFixtures[i];
        const indOn = fixture?.userData?.individualOn;
        const finalOn = enabled && (indOn !== false);
        light.intensity = finalOn ? b * 22.5 : 0;
      });
    }
    // 关灯时：所有 mesh 的自发光归零
    T.modelRoot.traverse((child: any) => {
      if (child.isMesh && child.material && !child.userData._hlEmissive) {
        child.userData._origEmissiveInt = child.userData._origEmissiveInt ?? child.material.emissiveIntensity;
        child.material.emissiveIntensity = enabled ? child.userData._origEmissiveInt : 0;
      }
    });
    // 关灯时隐藏空调脉冲标记光柱（RectAreaLightHelper 始终显示）
    if (T.deviceMarkers) {
      T.deviceMarkers.forEach((m: any) => { m.group.visible = enabled; });
    }
    const ambient = T.scene.getObjectByName('__ambient');
    if (ambient) ambient.intensity = enabled ? 0.4 : 0;
    const hemi = T.scene.getObjectByName('__hemi');
    if (hemi) hemi.intensity = enabled ? 0.35 : 0;
    const dirLight = T.scene.getObjectByName('__directional');
    if (dirLight) dirLight.intensity = enabled ? 0.8 : 0;
    if (T.scene.environmentIntensity !== undefined) {
      T.scene.environmentIntensity = enabled ? 0.4 : 0;
    }
    if (!enabled) {
      T.scene.environment = null;
    } else if (T.envTexture && !T.scene.environment) {
      T.scene.environment = T.envTexture;
    }
    T.renderer.toneMappingExposure = enabled ? 1.0 + b * 0.2 : 0.1;
    setDeviceList((prev) => prev.map((it) => it.type === 'light' ? { ...it, meta: `${deviceDB.light.power}W · ${deviceDB.light.colorTemp}` } : it));
    updateStatusClosure(T);
  }
  function applyACClosure(T: any, enabled: boolean, temperature: number) {
    stateRef.current.ac.enabled = enabled;
    stateRef.current.ac.temperature = temperature;
    T.airflowSystems.forEach((sys: any) => { sys.mat.opacity = enabled ? 0.55 : 0; sys.mat.visible = enabled; });
    const t = (temperature - 16) / 14;
    let fogColor, ambientColor, particleColor;
    if (t < 0.4) { const k = (0.4 - t) / 0.4; fogColor = new THREE.Color(0x06081a).lerp(new THREE.Color(0x0a1428), k); ambientColor = new THREE.Color(0x6688aa).lerp(new THREE.Color(0x4466aa), k * 0.5); particleColor = new THREE.Color(0x88ccff).lerp(new THREE.Color(0x44aaff), k * 0.5); }
    else if (t > 0.6) { const k = (t - 0.6) / 0.4; fogColor = new THREE.Color(0x06081a).lerp(new THREE.Color(0x1a1008), k); ambientColor = new THREE.Color(0x6688aa).lerp(new THREE.Color(0xaa8866), k * 0.5); particleColor = new THREE.Color(0x88ccff).lerp(new THREE.Color(0xffaa66), k * 0.6); }
    else { fogColor = new THREE.Color(0x06081a); ambientColor = new THREE.Color(0x6688aa); particleColor = new THREE.Color(0x88ccff); }
    if (enabled) { T.scene.fog.color = fogColor; }
    else { T.scene.fog.color = new THREE.Color(0x0a1228); }
    T.scene.background = new THREE.Color(0x0a1228);
    const ambient = T.scene.getObjectByName('__ambient');
    if (ambient && stateRef.current.lighting.enabled) ambient.color = enabled ? ambientColor : new THREE.Color(0x6688aa);
    T.airflowSystems.forEach((sys: any) => { sys.mat.color = enabled ? particleColor : sys.mat.color; });
    T.acUnits.forEach((mesh: any) => { if (mesh.userData.deviceInfo) mesh.userData.deviceInfo.temp = enabled ? `${temperature}°C` : '待机'; });
    setDeviceList((prev) => prev.map((it) => it.type === 'ac' ? { ...it, meta: `${deviceDB.ac.power}W · ${temperature}°C` } : it));
    if (selectedDevice && selectedDevice.type === 'ac') setSelectedDevice({ ...selectedDevice, info: { ...selectedDevice.info, temp: enabled ? `${temperature}°C` : '待机' } });
    updateStatusClosure(T);
  }
  function updateStatusClosure(T: any) {
    const lightCount = T.lightFixtures ? new Set(T.lightFixtures.map((m: any) => m.userData.deviceInfo?.name)).size : 0;
    const acCount = T.acUnits ? new Set(T.acUnits.map((m: any) => m.userData.acIndex)).size : 0;
    const lightPower = stateRef.current.lighting.enabled ? lightCount * deviceDB.light.power : 0;
    const acPower = stateRef.current.ac.enabled ? acCount * deviceDB.ac.power : 0;
    const totalPower = (lightPower + acPower) / 1000;
    T._status = { total: lightCount + acCount, active: (stateRef.current.lighting.enabled ? lightCount : 0) + (stateRef.current.ac.enabled ? acCount : 0), totalPower };
    setKpiPower(totalPower.toFixed(1));
    const tv = (Math.random() * 10 - 3).toFixed(1);
    setKpiTrend({ val: (parseFloat(tv) >= 0 ? '+' : '') + tv + '%', up: parseFloat(tv) >= 0 });
    setEnergyTag(totalPower > 8 ? 'HIGH' : 'NORMAL');
    setEnergyTagWarn(totalPower > 8);
  }
  function deselectClosure(T: any) {
    if (T.selectedObject) {
      T.selectedObject.traverseVisible((child: any) => {
        if (child.isMesh && child.material && child.userData._hlEmissive !== undefined) {
          child.material.emissive = child.userData._hlEmissive;
          child.material.emissiveIntensity = child.userData._hlIntensity;
          delete child.userData._hlEmissive;
          delete child.userData._hlIntensity;
        }
      });
      T.selectedObject = null;
    }
    setSelectedDevice(null);
    setActiveDeviceIdx(-1);
  }
  function pushAlertUI(type: AlertItem['type'], msg: string) {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    setAlerts((prev) => [{ type, msg, time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` }, ...prev].slice(0, 20));
  }

  // 设备列表点击
  const onDeviceItemClick = (item: DeviceListItem, idx: number) => {
    const T = threeRef.current;
    if (T.selectedObject) deselectClosure(T);
    T.selectedObject = item.obj;
    item.obj.traverseVisible((child: any) => {
      if (child.isMesh && child.material) {
        child.userData._hlEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color();
        child.userData._hlIntensity = child.material.emissiveIntensity || 0;
        child.material.emissive = new THREE.Color(0x00d4ff);
        child.material.emissiveIntensity = 0.7;
      }
    });
    setSelectedDevice({ obj: item.obj, info: item.obj.userData.deviceInfo, type: item.obj.userData.deviceType });
    // 记录灯具索引和单灯状态
    if (item.type === 'light') {
      const lightIdx = T.lightFixtures.indexOf(item.obj);
      const individualOn = item.obj.userData.individualOn ?? stateRef.current.lighting.enabled;
      item.obj.userData.individualOn = individualOn;
      setSelectedDevice({ obj: item.obj, info: item.obj.userData.deviceInfo, type: 'light', lightIdx, individualOn });
    }
    setActiveDeviceIdx(idx);
    // 聚焦
    const box = new THREE.Box3().setFromObject(item.obj);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 2);
    const dist = maxDim * 3 + 3;
    const dir = new THREE.Vector3(0.8, 0.5, 0.9).normalize();
    T.cameraTween = { startPos: T.camera.position.clone(), endPos: center.clone().add(dir.multiplyScalar(dist)), startTarget: T.controls.target.clone(), endTarget: center.clone(), time: 0, duration: 0.9 };
  };

  const onCloseInfo = () => { const T = threeRef.current; deselectClosure(T); setShowList(true); };

  // 单灯开关（控制选中的单个灯具）
  const onToggleIndividualLight = () => {
    if (!selectedDevice || selectedDevice.type !== 'light' || selectedDevice.lightIdx < 0) return;
    const T = threeRef.current;
    const newOn = !selectedDevice.individualOn;
    const lightIdx = selectedDevice.lightIdx;
    const obj = selectedDevice.obj;
    // 记录单灯状态
    obj.userData.individualOn = newOn;
    const b = stateRef.current.lighting.brightness;
    const mode = lightingModeRef.current;

    if (mode === 'emissive') {
      // emissive 模式：改变灯具模型颜色（橘红→灰色）
      if (obj.material) {
        const colorOn = new THREE.Color(0xff4400);
        const colorOff = new THREE.Color(0x555555);
        const tmpColor = new THREE.Color();
        if (newOn) {
          tmpColor.lerpColors(colorOff, colorOn, b);
        } else {
          tmpColor.copy(colorOff);
        }
        obj.material.color = tmpColor.clone();
      }
    } else {
      // rect 模式：控制对应的 RectAreaLight
      const rect = T.rectLights?.[lightIdx];
      if (rect) {
        rect.intensity = newOn ? b * 22.5 : 0;
      }
    }
    // 更新设备信息状态
    obj.userData.deviceInfo.status = newOn ? '运行中' : '已关闭';
    setSelectedDevice({ ...selectedDevice, individualOn: newOn, info: { ...selectedDevice.info, status: newOn ? '运行中' : '已关闭' } });
    // 更新设备列表 meta
    setDeviceList((prev) => prev.map((it, i) => i === activeDeviceIdx ? { ...it, meta: `${deviceDB.light.power}W · ${newOn ? '运行中' : '已关闭'}` } : it));
    showToast(`${selectedDevice.info.name} 已${newOn ? '开启' : '关闭'}`);
    pushAlertUI(newOn ? 'info' : 'warning', `${selectedDevice.info.name} 已${newOn ? '开启' : '关闭'}`);
  };

  // 计算状态栏数据
  const lightCount = deviceList.filter((d) => d.type === 'light').length;
  const acCount = deviceList.filter((d) => d.type === 'ac').length;
  const totalDevices = lightCount + acCount;
  const activeDevices = (lightingOn ? lightCount : 0) + (acOn ? acCount : 0);
  const totalPowerVal = ((lightingOn ? lightCount * deviceDB.light.power : 0) + (acOn ? acCount * deviceDB.ac.power : 0)) / 1000;
  const avgTemp = acOn ? temperature : '--';
  // 照度计算：亮度80%时 = 300 lx（用户要求，降低亮度）
  // 公式：lux = 300 + (brightness/100) * 0，brightness=80% → 300 lx
  // 固定 300 lx，不随亮度变化（保持基础照度）
  const luxVal = lightingOn ? 300 : 30;
  let energyLevel = 'A', energyClass = 'good';
  if (totalPowerVal > 8) { energyLevel = 'C'; energyClass = 'warn'; }
  else if (totalPowerVal > 5) { energyLevel = 'B'; energyClass = ''; }
  else if (totalPowerVal > 2) { energyLevel = 'A'; energyClass = 'good'; }
  else { energyLevel = 'A+'; energyClass = 'good'; }

  // 环形图
  const ringTotal = totalDevices;
  const ringLightPct = totalDevices > 0 ? lightCount / totalDevices : 0;
  const ringAcPct = totalDevices > 0 ? acCount / totalDevices : 0;
  const ringLightActivePct = lightingOn ? ringLightPct : 0;
  const ringAcActivePct = acOn ? ringAcPct : 0;
  const ringC = 2 * Math.PI * 42;

  // 信息面板字段
  const infoFields: InfoField[] = (() => {
    if (!selectedDevice) return [];
    const info = selectedDevice.info;
    const rows: InfoField[] = [
      { label: '设备状态', value: info.status },
      { label: '额定功率', value: info.power },
      { label: '品牌', value: info.brand || '-' },
      { label: '型号', value: info.model || '-' },
      { label: '运行温度', value: info.temp },
      { label: '电压', value: info.voltage || '-' },
    ];
    if (selectedDevice.type === 'light') { rows.push({ label: '色温', value: info.colorTemp }); rows.push({ label: '使用寿命', value: info.lifespan }); }
    if (selectedDevice.type === 'ac') { rows.push({ label: '制冷剂', value: info.refrigerant }); rows.push({ label: '风量', value: info.airflow }); rows.push({ label: '噪音', value: info.noise }); }
    if (selectedDevice.type === 'furniture') { rows.push({ label: '材质', value: info.material }); rows.push({ label: '质保', value: info.warranty }); }
    if (selectedDevice.type === 'wall') { rows.push({ label: '材质', value: info.material }); rows.push({ label: '防火等级', value: info.fireRating }); }
    rows.push({ label: '空间坐标', value: info.position, full: true });
    rows.push({ label: '尺寸 (W×H×D)', value: info.size, full: true });
    if (info.installDate) rows.push({ label: '安装日期', value: info.installDate });
    if (info.lastMaintenance) rows.push({ label: '最近维护', value: info.lastMaintenance });
    return rows;
  })();

  return (
    <div className="app">
      {/* 加载动画 */}
      {loading && (
        <div className="loader">
          <div className="loader-ring"></div>
          <div className="loader-text">{loaderText}</div>
          <div className="loader-progress"><div className="loader-progress-bar" style={{ width: loaderPct + '%' }}></div></div>
        </div>
      )}

      {/* 3D 画布 */}
      <div id="canvas-container" ref={containerRef}></div>

      {/* 顶部标题栏 */}
      <div className="header">
        <div className="header-left">
          <div className="logo-mark"><div className="logo-inner"></div></div>
          <div className="header-title">
            <h1>综合能源驾驶舱</h1>
            <div className="subtitle">COMPREHENSIVE <span className="accent">ENERGY COCKPIT</span> · WebGPU 3D VISUALIZATION</div>
          </div>
        </div>
        <div className="header-right">
          {/* 灯光模式切换：发光材质(性能好) vs RectAreaLight(效果好) */}
          <button
            onClick={() => {
              const newMode = lightingMode === 'emissive' ? 'rect' : 'emissive';
              setLightingMode(newMode);
              const T = threeRef.current;
              if (T.scene) {
                switchLightingModeRef.current?.(T, newMode);
              }
              showToast(newMode === 'emissive' ? '已切换至发光材质模式（性能优先）' : '已切换至面光源模式（效果优先）');
            }}
            style={{
              padding: '4px 10px', fontSize: '10px', fontWeight: 600, letterSpacing: '1px',
              border: '1px solid ' + (lightingMode === 'emissive' ? 'var(--success)' : 'var(--primary)'),
              background: lightingMode === 'emissive' ? 'rgba(0,255,136,0.1)' : 'rgba(0,212,255,0.1)',
              color: lightingMode === 'emissive' ? 'var(--success)' : 'var(--primary)',
              borderRadius: '4px', cursor: 'pointer', marginRight: '8px',
            }}
            title="切换灯光渲染模式"
          >
            {lightingMode === 'emissive' ? '⚡ 性能模式' : '💡 效果模式'}
          </button>
          <div className="render-badge">
            <div className="dot"></div>
            <span>{renderMode}</span>
          </div>
          <div className="header-stat">
            <div className="label">FPS</div>
            <div className="value" id="fps-value">{fps || '--'}</div>
          </div>
          <div className="header-stat">
            <div className="label">SYS TIME</div>
            <div className="value">{clock}</div>
          </div>
          <div className="header-stat">
            <div className="label">DATE</div>
            <div className="value" style={{ fontSize: '13px' }}>{date}</div>
          </div>
        </div>
      </div>

      {/* 顶部模块导航栏 */}
      <div style={{ position: 'absolute', top: '72px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px', background: 'var(--bg-panel)', border: '1px solid var(--border-line)', borderRadius: '6px', padding: '4px', backdropFilter: 'blur(14px)', zIndex: 45 }}>
        {[
          { id: 'overview2', label: '全景总览', icon: '🗺' },
          { id: 'overview', label: '总览2', icon: '📊' },
          { id: 'building', label: '节能管理', icon: '🏢' },
          { id: 'solar', label: '光伏发电', icon: '☀' },
          { id: 'charging', label: '充电桩', icon: '🔌' },
          { id: 'load', label: '负荷管理', icon: '🎛' },
          { id: 'grid', label: '配网管理', icon: '⚡' },
          { id: 'carbon', label: '碳监测', icon: '🌱' },
        ].map((mod) => (
          <button key={mod.id} onClick={() => onSwitchModule(mod.id as any)} style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', border: '1px solid ' + (activeModule === mod.id ? 'var(--primary)' : 'transparent'), background: activeModule === mod.id ? 'var(--primary-bg)' : 'transparent', color: activeModule === mod.id ? 'var(--primary)' : 'var(--text-mid)', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.25s', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: activeModule === mod.id ? '0 0 12px rgba(0,212,255,0.3)' : 'none' }}>
            <span style={{ fontSize: '14px' }}>{mod.icon}</span><span>{mod.label}</span>
          </button>
        ))}
      </div>

      {/* 各模块面板 */}
      {activeModule === 'overview' && <CockpitPanel kpiPower={kpiPower} lightingOn={lightingOn} acOn={acOn} />}
      {activeModule === 'overview2' && <OverviewPanel2 kpiPower={kpiPower} />}
      {activeModule === 'solar' && <SolarPanel kpiPower={kpiPower} />}
      {activeModule === 'carbon' && <CarbonPanel kpiPower={kpiPower} />}
      {activeModule === 'charging' && <ChargingPanel kpiPower={kpiPower} />}
      {activeModule === 'load' && <LoadManagementPanel kpiPower={kpiPower} />}
      {activeModule === 'grid' && <GridPanel kpiPower={kpiPower} />}

      {/* 操作提示 - 仅楼宇模块显示 */}
      {activeModule === 'building' && (
      <div className="help-hint">
        <span><span className="key">L-DRAG</span> 旋转</span>
        <span><span className="key">R-DRAG</span> 平移</span>
        <span><span className="key">WHEEL</span> 缩放</span>
        <span><span className="key">CLICK</span> 设备详情</span>
        <span><span className="key">DBL-CLICK</span> 聚焦</span>
      </div>
      )}

      {/* 左侧主面板 - 仅楼宇模块 */}
      {activeModule === 'building' && (
      <div className="panel left-panel">
        <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
        <div className="panel-title">系统控制中心<span className="title-en">CTRL CENTER</span></div>

        <div className="kpi-card">
          <div className="kpi-label">
            实时总能耗
            <span className="status-tag" style={energyTagWarn ? { borderColor: 'var(--warn)', color: 'var(--warn)' } : {}}>{energyTag}</span>
          </div>
          <div>
            <span className="kpi-value num">{kpiPower}</span>
            <span className="kpi-unit">kWh</span>
          </div>
          <div className={'kpi-trend' + (kpiTrend.up ? '' : ' down')}>
            <span>{kpiTrend.up ? '▲' : '▼'}</span><span>{kpiTrend.val}</span>
            <span style={{ color: 'var(--text-dim)', marginLeft: 'auto' }}>较昨日</span>
          </div>
          <canvas className="kpi-chart" ref={powerChartRef} width={280} height={36}></canvas>
          {/* 碳排放转换：中国电网平均碳排放因子 0.5810 kgCO₂/kWh */}
          <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(0, 255, 204, 0.06)', borderLeft: '2px solid var(--cyan-glow)', borderRadius: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '1px' }}>碳排放量</span>
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', color: 'var(--cyan-glow)', fontWeight: 600 }}>
              {(parseFloat(kpiPower || '0') * 0.5810).toFixed(2)} <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>kgCO₂/h</span>
            </span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
            <span>日累计</span>
            <span style={{ fontFamily: 'Orbitron, monospace', color: 'var(--text-mid)' }}>{(parseFloat(kpiPower || '0') * 0.5810 * 24).toFixed(1)} kgCO₂</span>
          </div>
        </div>

        <div className="control-group">
          <div className="control-group-label">
            <span className="group-name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>
              照明系统 / LIGHTING
            </span>
            <span className={'status-tag' + (lightingOn ? '' : ' off')}>{lightingOn ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
          <button className={'toggle-btn' + (lightingOn ? ' active' : '')} onClick={onLightingToggle}>
            <span>{lightingOn ? '照明已开启' : '照明已关闭'}</span>
          </button>
          <div className="slider-row">
            <div className="slider-header">
              <span>亮度调节 · BRIGHTNESS</span>
              <span className="slider-value">{brightness}%</span>
            </div>
            <input type="range" min="0" max="100" value={brightness} onChange={onBrightness} onInput={onBrightness as any} style={{ ['--pct' as any]: brightness + '%' }} />
          </div>
        </div>

        <div className="control-group">
          <div className="control-group-label">
            <span className="group-name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/></svg>
              空调系统 / HVAC
            </span>
            <span className={'status-tag' + (acOn ? '' : ' off')}>{acOn ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
          <button className={'toggle-btn' + (acOn ? ' active' : '')} onClick={onAcToggle}>
            <span>{acOn ? '空调已开启' : '空调已关闭'}</span>
          </button>
          <div className="slider-row">
            <div className="slider-header">
              <span>温度设定 · TEMPERATURE</span>
              <span className="slider-value">{temperature}°C</span>
            </div>
            <input type="range" min="16" max="30" value={temperature} onChange={onTemperature} style={{ ['--pct' as any]: Math.round((temperature - 16) / 14 * 100) + '%' }} />
          </div>
        </div>

        <div className="control-group">
          <div className="control-group-label">
            <span className="group-name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/></svg>
              视图控制 / VIEW
            </span>
          </div>
          <div className="view-btns">
            <button className={'toggle-btn' + (autoRotate ? ' active' : '')} onClick={onAutoRotate}>自动旋转</button>
            <button className="toggle-btn" onClick={onResetView}>重置视角</button>
            <button className="toggle-btn" onClick={onTopView}>俯视视角</button>
            <button className={'toggle-btn' + (showList ? ' active' : '')} onClick={onToggleList}>设备列表</button>
          </div>
        </div>

        {/* 楼层选择器 */}
        <div className="control-group">
          <div className="control-group-label">
            <span className="group-name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 11h6"/></svg>
              楼层选择 / FLOOR
            </span>
            <span className="status-tag">{activeFloor === 0 ? '整栋楼' : `${activeFloor}F`}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
            <button onClick={() => onFloorSelect(0)} style={floorBtnStyle(activeFloor === 0)}>整栋</button>
            {Array.from({ length: 16 }, (_, i) => i + 1).map(f => (
              <button key={f} onClick={() => onFloorSelect(f)} style={floorBtnStyle(activeFloor === f)}>{f}F</button>
            ))}
          </div>
          {activeFloor > 0 && (
            <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(0,212,255,0.05)', borderRadius: '4px', borderLeft: '2px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                <span>{activeFloor}F 用电量</span><span style={{ fontFamily: 'Orbitron, monospace', color: 'var(--primary)' }}>{(parseFloat(kpiPower||'0') / 16 * activeFloor).toFixed(1)} kW</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                <span>灯具数量</span><span style={{ fontFamily: 'Orbitron, monospace', color: 'var(--text-main)' }}>{Math.ceil(54 / 16 * activeFloor)} 个</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
                <span>碳排放</span><span style={{ fontFamily: 'Orbitron, monospace', color: 'var(--cyan-glow)' }}>{(parseFloat(kpiPower||'0') / 16 * activeFloor * 0.5810).toFixed(2)} kgCO₂/h</span>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* 右侧设备列表面板 - 仅楼宇模块 */}
      {activeModule === 'building' && showList && (
        <div className="panel right-panel">
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div className="panel-title">设备状态总览<span className="title-en">{totalDevices} UNITS</span></div>
          <div className="device-ring-row">
            <div className="device-ring">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#ffdc64" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${ringLightActivePct * ringC} ${ringC}`} style={{ filter: 'drop-shadow(0 0 4px #ffdc64)' }} />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#64c8ff" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${ringAcActivePct * ringC} ${ringC}`} strokeDashoffset={`${-ringLightActivePct * ringC}`} style={{ filter: 'drop-shadow(0 0 4px #64c8ff)' }} />
              </svg>
              <div className="ring-center">
                <div className="num">{ringTotal}</div>
                <div className="lbl">TOTAL</div>
              </div>
            </div>
            <div className="ring-legend">
              <div className="leg-item"><div className="leg-dot" style={{ background: '#ffdc64', color: '#ffdc64' }}></div><span>照明灯具</span><span className="leg-val">{lightCount}</span></div>
              <div className="leg-item"><div className="leg-dot" style={{ background: '#64c8ff', color: '#64c8ff' }}></div><span>空调设备</span><span className="leg-val">{acCount}</span></div>
              <div className="leg-item"><div className="leg-dot" style={{ background: 'var(--success)', color: 'var(--success)' }}></div><span>在线</span><span className="leg-val">{activeDevices}</span></div>
            </div>
          </div>
          <div className="device-list">
            {deviceList.map((item, i) => (
              <div key={i} className={`device-item ${item.type}` + (i === activeDeviceIdx ? ' active' : '')} onClick={() => onDeviceItemClick(item, i)}>
                <div className="device-icon">{item.type === 'light' ? 'L' : 'A'}</div>
                <div className="device-info">
                  <div className="name">{item.name}</div>
                  <div className="meta">{item.meta}</div>
                </div>
                <div className={'device-status-dot' + ((item.type === 'light' ? lightingOn : acOn) ? '' : ' off')}></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 设备详情面板 */}
      {selectedDevice && (
        <div className="panel info-panel show">
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div className="panel-title">
            设备详情
            <span className="device-type-badge">{selectedDevice.info.typeName}</span>
            <button className="close-btn" onClick={onCloseInfo}>×</button>
          </div>
          <div className="device-name">
            <span>{selectedDevice.info.name}</span>
            <span className="status-pill" style={selectedDevice.individualOn === false ? { color: 'var(--text-dim)', borderColor: 'var(--text-dim)', background: 'rgba(74,100,133,0.1)' } : {}}>{selectedDevice.info.status || '运行中'}</span>
          </div>
          {/* 灯具单灯开关控制 */}
          {selectedDevice.type === 'light' && (
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-line)' }}>
              <button className={'toggle-btn' + (selectedDevice.individualOn !== false ? ' active' : '')} onClick={onToggleIndividualLight}>
                <span>{selectedDevice.individualOn !== false ? '灯具已开启' : '灯具已关闭'}</span>
              </button>
            </div>
          )}
          <div className="info-grid">
            {infoFields.map((f, i) => (
              <div key={i} className={'info-cell' + (f.full ? ' full' : '')}>
                <div className="label">{f.label}</div>
                <div className="value">{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 左下告警面板 - 仅楼宇模块 */}
      {activeModule === 'building' && (
      <div className="panel alert-panel">
        <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
        <div className="panel-title">实时告警<span className="title-en">{alerts.length} ALERTS</span></div>
        <div className="alert-list">
          {alerts.map((a, i) => (
            <div key={i} className={`alert-item ${a.type}`}>
              <span className="alert-icon">{a.type === 'warning' ? '▲' : a.type === 'danger' ? '●' : '◆'}</span>
              <div className="alert-content">
                <div className="alert-msg">{a.msg}</div>
                <div className="alert-time">{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* 右下楼层信息 - 仅楼宇模块 */}
      {activeModule === 'building' && (
      <div className="panel floor-panel">
        <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
        <div className="panel-title">楼层信息<span className="title-en">FLOOR INFO</span></div>
        <div className="floor-info-grid">
          <div className="fi-item"><div className="fi-label">建筑面积</div><div className="fi-value">1,280<span className="sub">m²</span></div></div>
          <div className="fi-item"><div className="fi-label">楼层</div><div className="fi-value">F1<span className="sub">/1F</span></div></div>
          <div className="fi-item"><div className="fi-label">工位数量</div><div className="fi-value">86<span className="sub">个</span></div></div>
          <div className="fi-item"><div className="fi-label">在线人数</div><div className="fi-value">{onlinePeople}<span className="sub">人</span></div></div>
          <div className="fi-item"><div className="fi-label">碳排放速率</div><div className="fi-value" style={{color:'var(--cyan-glow)'}}>{(totalPowerVal * 0.5810).toFixed(2)}<span className="sub">kg/h</span></div></div>
          <div className="fi-item"><div className="fi-label">空气湿度</div><div className="fi-value">52<span className="sub">%</span></div></div>
        </div>
      </div>
      )}

      {/* 底部状态栏 - 仅楼宇模块 */}
      {activeModule === 'building' && (
      <div className="status-bar">
        <div className="status-item"><div className="label">设备总数</div><div className="value">{totalDevices}<span className="unit">台</span></div></div>
        <div className="status-item"><div className="label">运行设备</div><div className="value good">{activeDevices}<span className="unit">台</span></div></div>
        <div className="status-item"><div className="label">总功率</div><div className="value">{totalPowerVal.toFixed(1)}<span className="unit">kW</span></div></div>
        <div className="status-item"><div className="label">碳排放量</div><div className="value" style={{color:'var(--cyan-glow)'}}>{(totalPowerVal * 0.5810).toFixed(2)}<span className="unit">kgCO₂/h</span></div></div>
        <div className="status-item"><div className="label">平均温度</div><div className="value">{avgTemp}<span className="unit">°C</span></div></div>
        <div className="status-item"><div className="label">环境照度</div><div className="value">{luxVal}<span className="unit">lx</span></div></div>
        <div className="status-item"><div className="label">能耗等级</div><div className={'value ' + energyClass} style={{ fontSize: '20px' }}>{energyLevel}</div></div>
        <div className="status-item"><div className="label">系统状态</div><div className="value good" style={{ fontSize: '14px', letterSpacing: '2px' }}>NORMAL</div></div>
      </div>
      )}

      {/* Toast */}
      {toastMsg && <div className="toast show">{toastMsg}</div>}
    </div>
  );
}
