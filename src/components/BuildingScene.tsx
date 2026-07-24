'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

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
  const [fps, setFps] = useState(0);
  const [clock, setClock] = useState('--:--:--');
  const [date, setDate] = useState('');

  const [lightingOn, setLightingOn] = useState(true);
  const [brightness, setBrightness] = useState(80);
  const [acOn, setAcOn] = useState(true);
  const [temperature, setTemperature] = useState(24);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showList, setShowList] = useState(true);

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
      T.scene.background = new THREE.Color(0x06081a);
      T.scene.fog = new THREE.FogExp2(0x06081a, 0.012);

      T.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
      T.camera.position.set(30, 22, 30);

      // 渲染器
      setLoaderText('初始化渲染器...');
      let realWebGPU = false;
      if (navigator.gpu && (navigator.gpu as any).requestAdapter) {
        try { const adapter = await (navigator.gpu as any).requestAdapter(); realWebGPU = !!adapter; } catch { realWebGPU = false; }
      }
      try {
        if (realWebGPU) {
          T.renderer = new WebGPURenderer({ antialias: true, powerPreference: 'high-performance' });
          await T.renderer.init();
          setRenderMode('WebGPU');
        } else throw new Error('no webgpu');
      } catch {
        T.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        setRenderMode('WebGL2');
      }
      T.renderer.setSize(window.innerWidth, window.innerHeight);
      T.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      T.renderer.shadowMap.enabled = true;
      T.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      T.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      T.renderer.toneMappingExposure = 1.05;
      containerRef.current!.appendChild(T.renderer.domElement);

      // 后期处理
      if (renderModeRef.current !== 'WebGPU') {
        T.composer = new EffectComposer(T.renderer);
        T.composer.addPass(new RenderPass(T.scene, T.camera));
        // Bloom 阈值调高，避免 HDR 照明下整体过曝，只让发光元素辉光
        T.composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.4, 0.7));
        T.composer.addPass(new OutputPass());
      }

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

    // ===== 环境（HDR 环境贴图照亮 + 方向光投影） =====
    function setupEnvironment(T: any) {
      // 环境光（基础填充，HDR 提供主要照明）
      const ambient = new THREE.AmbientLight(0x88aacc, 0.25);
      ambient.name = '__ambient';
      T.scene.add(ambient);

      // 主方向光（投射清晰阴影，增强细节立体感）
      // 斜射角度让阴影明显投射到地面侧面
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
      dirLight.position.set(30, 45, 18);
      dirLight.target.position.set(0, 0, 0);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(2048, 2048);
      dirLight.shadow.camera.near = 1;
      dirLight.shadow.camera.far = 120;
      // 收紧 frustum 到模型实际范围（模型归一化后约 40×2.3×26），提高阴影分辨率
      dirLight.shadow.camera.left = -28;
      dirLight.shadow.camera.right = 28;
      dirLight.shadow.camera.top = 22;
      dirLight.shadow.camera.bottom = -22;
      dirLight.shadow.bias = -0.0002;
      dirLight.shadow.normalBias = 0.015;
      T.scene.add(dirLight);
      T.scene.add(dirLight.target);
      dirLight.name = '__directional';

      // 辅助方向光（冷色补光，从对侧照亮暗部细节）
      const fillLight = new THREE.DirectionalLight(0x4488cc, 0.5);
      fillLight.position.set(-30, 20, -25);
      fillLight.name = '__fill';
      T.scene.add(fillLight);

      const hemi = new THREE.HemisphereLight(0x88aaff, 0x223344, 0.3);
      hemi.name = '__hemi';
      T.scene.add(hemi);

      // 加载 HDR 环境贴图（用于 PBR 反射 + 背景照明）
      setLoaderText('加载 HDR 环境贴图...');
      const rgbeLoader = new RGBELoader();
      rgbeLoader.load('/studio_small.hdr', (envTexture: any) => {
        envTexture.mapping = THREE.EquirectangularReflectionMapping;
        // HDR 用于 PBR 反射/照明，保持线性空间（不设 colorSpace，避免 sRGB 警告）
        T.scene.environment = envTexture;
        T.scene.environmentIntensity = 0.8;
        T.envTexture = envTexture;
        console.log('HDR 环境贴图加载完成');
      }, undefined, (err: any) => {
        console.warn('HDR 加载失败，使用程序化环境:', err);
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
          setupAirflow(T);
          setupGround(T);
          setupDeviceMarkers(T);
          fitCameraToModel(T);
          applyLighting(T);
          applyAC(T);
          buildDeviceList(T);
          updateStatus(T);
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
        // 墙体：纯漫反射，无反射，清晰投影
        wall: { color: 0x2a3a52, metalness: 0.0, roughness: 1.0, emissive: 0x0a1428, emissiveIntensity: 0.1, envMapIntensity: 0.0 },
        // 桌椅：中青蓝，哑光，细节清晰
        furniture: { color: 0x1e3a5f, metalness: 0.25, roughness: 0.55, emissive: 0x0a1830, emissiveIntensity: 0.08, envMapIntensity: 0.6 },
        // logo 装饰：亮青色，高金属反射
        logo: { color: 0x3a6a9a, metalness: 0.6, roughness: 0.3, emissive: 0x00d4ff, emissiveIntensity: 0.15, envMapIntensity: 1.0 },
        // 灯具：暖白发光灯罩 + 青色外壳
        light: { color: 0x4a6080, metalness: 0.5, roughness: 0.35, emissive: 0xffe8b0, emissiveIntensity: 0.8, envMapIntensity: 0.8 },
        // 空调：冷青蓝金属，干净反光
        ac: { color: 0x4a8ab8, metalness: 0.7, roughness: 0.25, emissive: 0x103040, emissiveIntensity: 0.05, envMapIntensity: 1.0 },
        // 默认：通用科技青
        default: { color: 0x2a4a6a, metalness: 0.3, roughness: 0.6, emissive: 0x081830, emissiveIntensity: 0.08, envMapIntensity: 0.6 },
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

    function setupPointLights(T: any) {
      const positions: any[] = [];
      const tmpBox = new THREE.Box3();
      const tmp = new THREE.Vector3();
      T.lightFixtures.forEach((mesh: any) => {
        tmpBox.setFromObject(mesh);
        tmpBox.getCenter(tmp);
        positions.push(tmp.clone());
      });
      if (positions.length === 0) return;
      const maxLights = 6;
      const samples = farthestPointSampling(positions, Math.min(maxLights, positions.length));
      T.pointLights = [];
      samples.forEach((pos: any, i: number) => {
        const light = new THREE.PointLight(0xffe8b0, 0, 22, 1.8);
        light.position.set(pos.x, pos.y - 0.3, pos.z);
        light.name = `__pointLight_${i}`;
        light.castShadow = false;
        T.scene.add(light);
        T.pointLights.push(light);
      });
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
      let dist = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      dist *= 1.5;
      T.camera.position.set(center.x + dist * 0.7, center.y + dist * 0.45, center.z + dist * 0.9);
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
      if (T.composer) T.composer.setSize(window.innerWidth, window.innerHeight);
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
      while (cur) { if (cur.userData.deviceInfo && cur.userData.deviceInfo.name) return cur; cur = cur.parent; }
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
      setSelectedDevice({ obj, info: obj.userData.deviceInfo, type: obj.userData.deviceType });
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
      // 点光源强度随亮度调节
      T.pointLights.forEach((light: any) => { light.intensity = s.enabled ? b * 22 : 0; });
      // 灯具发光强度随开关/亮度变化（保留主题色，只调强度）
      T.lightFixtures.forEach((mesh: any) => {
        if (mesh.material && !mesh.userData._hlEmissive) {
          mesh.material.emissiveIntensity = s.enabled ? 0.5 + b * 1.2 : 0.05;
        }
      });
      // 环境光与半球光随照明变化
      const ambient = T.scene.getObjectByName('__ambient');
      if (ambient) ambient.intensity = s.enabled ? 0.25 + b * 0.2 : 0.1;
      const hemi = T.scene.getObjectByName('__hemi');
      if (hemi) hemi.intensity = s.enabled ? 0.3 : 0.1;
      // HDR 环境贴图强度随照明变化
      if (T.scene.environmentIntensity !== undefined) {
        T.scene.environmentIntensity = s.enabled ? 0.6 + b * 0.4 : 0.3;
      }
      // 曝光（HDR 照明下适当提高以看清细节）
      T.renderer.toneMappingExposure = s.enabled ? 0.9 + b * 0.3 : 0.5;
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
      if (s.enabled) { T.scene.fog.color = fogColor; T.scene.background = fogColor; }
      else { T.scene.fog.color = new THREE.Color(0x06081a); T.scene.background = new THREE.Color(0x06081a); }
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
    let fpsCounter = { frames: 0, lastTime: 0 };
    function animate() {
      if (disposed) return;
      T.rafId = requestAnimationFrame(animate);
      const delta = T.clock.getDelta();
      if (T.cameraTween) {
        T.cameraTween.time += delta;
        const t = Math.min(T.cameraTween.time / T.cameraTween.duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        T.camera.position.lerpVectors(T.cameraTween.startPos, T.cameraTween.endPos, eased);
        T.controls.target.lerpVectors(T.cameraTween.startTarget, T.cameraTween.endTarget, eased);
        if (t >= 1) T.cameraTween = null;
      }
      T.controls.update();
      if (T.deviceMarkers) {
        const time = T.clock.elapsedTime;
        T.deviceMarkers.forEach((m: any) => {
          const pulse = 0.5 + 0.5 * Math.sin(time * 2 + m.phase);
          m.ring.scale.setScalar(0.8 + pulse * 0.6);
          m.ring.material.opacity = 0.6 * (1 - pulse * 0.5);
          m.beam.material.opacity = 0.15 + pulse * 0.25;
        });
      }
      if (stateRef.current.ac.enabled && T.airflowSystems) updateAirflow(T, delta);
      fpsCounter.frames++;
      const now = performance.now();
      if (now - fpsCounter.lastTime >= 1000) {
        setFps(Math.round((fpsCounter.frames * 1000) / (now - fpsCounter.lastTime)));
        fpsCounter.frames = 0;
        fpsCounter.lastTime = now;
      }
      if (T.composer) T.composer.render();
      else T.renderer.render(T.scene, T.camera);
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
  const deviceListRef = useRef<DeviceListItem[]>([]);
  useEffect(() => { renderModeRef.current = renderMode; }, [renderMode]);
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
    if (T.applyLighting) { applyLightingClosure(T, v, brightness / 100); }
    setShowList(true);
    showToast(v ? '照明系统已开启' : '照明系统已关闭');
    pushAlertUI(v ? 'info' : 'warning', `照明系统已${v ? '开启' : '关闭'}`);
  };
  const onBrightness = (e: any) => { const v = parseInt(e.target.value); setBrightness(v); const T = threeRef.current; if (T.applyLighting) applyLightingClosure(T, lightingOn, v / 100); };
  const onAcToggle = () => {
    const v = !acOn; setAcOn(v);
    const T = threeRef.current;
    if (T.applyAC) applyACClosure(T, v, temperature);
    setShowList(true);
    showToast(v ? '空调系统已开启' : '空调系统已关闭');
    pushAlertUI(v ? 'info' : 'warning', `空调系统已${v ? '开启' : '关闭'}`);
  };
  const onTemperature = (e: any) => { const v = parseInt(e.target.value); setTemperature(v); const T = threeRef.current; if (T.applyAC) applyACClosure(T, acOn, v); };
  const onAutoRotate = () => { const v = !autoRotate; setAutoRotate(v); const T = threeRef.current; if (T.controls) { T.controls.autoRotate = v; T.controls.autoRotateSpeed = 0.8; } showToast(v ? '自动旋转已开启' : '自动旋转已关闭'); };
  const onResetView = () => { const T = threeRef.current; if (T.initialCamera) { T.cameraTween = { startPos: T.camera.position.clone(), endPos: T.initialCamera.pos.clone(), startTarget: T.controls.target.clone(), endTarget: T.initialCamera.target.clone(), time: 0, duration: 0.8 }; showToast('视角已重置'); } };
  const onTopView = () => { const T = threeRef.current; if (T.modelRoot) { const box = new THREE.Box3().setFromObject(T.modelRoot); const c = box.getCenter(new THREE.Vector3()); const s = box.getSize(new THREE.Vector3()); const d = Math.max(s.x, s.z) * 1.1; T.cameraTween = { startPos: T.camera.position.clone(), endPos: new THREE.Vector3(c.x, c.y + d, c.z + 0.01), startTarget: T.controls.target.clone(), endTarget: c.clone(), time: 0, duration: 0.8 }; showToast('已切换至俯视视角'); } };
  const onToggleList = () => { setShowList(!showList); if (!showList) { const T = threeRef.current; if (T.selectedObject) deselectClosure(T); } };

  // 闭包版状态应用（避免依赖 effect 内函数）
  function applyLightingClosure(T: any, enabled: boolean, b: number) {
    stateRef.current.lighting.enabled = enabled;
    stateRef.current.lighting.brightness = b;
    T.pointLights.forEach((light: any) => { light.intensity = enabled ? b * 22 : 0; });
    T.lightFixtures.forEach((mesh: any) => {
      if (mesh.material && !mesh.userData._hlEmissive) {
        mesh.material.emissiveIntensity = enabled ? 0.5 + b * 1.2 : 0.05;
      }
    });
    const ambient = T.scene.getObjectByName('__ambient');
    if (ambient) ambient.intensity = enabled ? 0.25 + b * 0.2 : 0.1;
    const hemi = T.scene.getObjectByName('__hemi');
    if (hemi) hemi.intensity = enabled ? 0.3 : 0.1;
    if (T.scene.environmentIntensity !== undefined) {
      T.scene.environmentIntensity = enabled ? 0.6 + b * 0.4 : 0.3;
    }
    T.renderer.toneMappingExposure = enabled ? 0.9 + b * 0.3 : 0.5;
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
    if (enabled) { T.scene.fog.color = fogColor; T.scene.background = fogColor; }
    else { T.scene.fog.color = new THREE.Color(0x06081a); T.scene.background = new THREE.Color(0x06081a); }
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

  // 计算状态栏数据
  const lightCount = deviceList.filter((d) => d.type === 'light').length;
  const acCount = deviceList.filter((d) => d.type === 'ac').length;
  const totalDevices = lightCount + acCount;
  const activeDevices = (lightingOn ? lightCount : 0) + (acOn ? acCount : 0);
  const totalPowerVal = ((lightingOn ? lightCount * deviceDB.light.power : 0) + (acOn ? acCount * deviceDB.ac.power : 0)) / 1000;
  const avgTemp = acOn ? temperature : '--';
  const luxVal = lightingOn ? Math.round(300 + (brightness / 100) * 450) : 30;
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
            <h1>智能楼宇数字孪生系统</h1>
            <div className="subtitle">SMART BUILDING <span className="accent">DIGITAL TWIN</span> · WebGPU 3D VISUALIZATION</div>
          </div>
        </div>
        <div className="header-right">
          <div className="render-badge">
            <div className="dot"></div>
            <span>{renderMode}</span>
          </div>
          <div className="header-stat">
            <div className="label">FPS</div>
            <div className="value">{fps || '--'}</div>
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

      {/* 操作提示 */}
      <div className="help-hint">
        <span><span className="key">L-DRAG</span> 旋转</span>
        <span><span className="key">R-DRAG</span> 平移</span>
        <span><span className="key">WHEEL</span> 缩放</span>
        <span><span className="key">CLICK</span> 设备详情</span>
        <span><span className="key">DBL-CLICK</span> 聚焦</span>
      </div>

      {/* 左侧主面板 */}
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
            <input type="range" min="0" max="100" value={brightness} onChange={onBrightness} style={{ ['--pct' as any]: brightness + '%' }} />
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
      </div>

      {/* 右侧设备列表面板 */}
      {showList && (
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
            <span className="status-pill">{selectedDevice.info.status || '运行中'}</span>
          </div>
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

      {/* 左下告警面板 */}
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

      {/* 右下楼层信息 */}
      <div className="panel floor-panel">
        <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
        <div className="panel-title">楼层信息<span className="title-en">FLOOR INFO</span></div>
        <div className="floor-info-grid">
          <div className="fi-item"><div className="fi-label">建筑面积</div><div className="fi-value">1,280<span className="sub">m²</span></div></div>
          <div className="fi-item"><div className="fi-label">楼层</div><div className="fi-value">F1<span className="sub">/1F</span></div></div>
          <div className="fi-item"><div className="fi-label">工位数量</div><div className="fi-value">86<span className="sub">个</span></div></div>
          <div className="fi-item"><div className="fi-label">在线人数</div><div className="fi-value">{onlinePeople}<span className="sub">人</span></div></div>
          <div className="fi-item"><div className="fi-label">CO₂ 浓度</div><div className="fi-value">420<span className="sub">ppm</span></div></div>
          <div className="fi-item"><div className="fi-label">空气湿度</div><div className="fi-value">52<span className="sub">%</span></div></div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="status-bar">
        <div className="status-item"><div className="label">设备总数</div><div className="value">{totalDevices}<span className="unit">台</span></div></div>
        <div className="status-item"><div className="label">运行设备</div><div className="value good">{activeDevices}<span className="unit">台</span></div></div>
        <div className="status-item"><div className="label">总功率</div><div className="value">{totalPowerVal.toFixed(1)}<span className="unit">kW</span></div></div>
        <div className="status-item"><div className="label">平均温度</div><div className="value">{avgTemp}<span className="unit">°C</span></div></div>
        <div className="status-item"><div className="label">环境照度</div><div className="value">{luxVal}<span className="unit">lx</span></div></div>
        <div className="status-item"><div className="label">能耗等级</div><div className={'value ' + energyClass} style={{ fontSize: '20px' }}>{energyLevel}</div></div>
        <div className="status-item"><div className="label">系统状态</div><div className="value good" style={{ fontSize: '14px', letterSpacing: '2px' }}>NORMAL</div></div>
      </div>

      {/* Toast */}
      {toastMsg && <div className="toast show">{toastMsg}</div>}
    </div>
  );
}
