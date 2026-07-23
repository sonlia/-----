import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

// 全局变量
let scene, camera, renderer, controls;
let gltfModel, hdrTexture;
let lightingSystem = { enabled: true, brightness: 0.8 };
let acSystem = { enabled: true, temperature: 24 };
let devices = [];
let selectedObject = null;
let autoRotate = false;
let animationId;

// 设备数据模拟
const deviceDatabase = {
    'light': {
        type: '照明设备',
        power: 50,
        status: '运行中',
        brand: 'Philips',
        installDate: '2024-01-15',
        lastMaintenance: '2024-06-20'
    },
    'ac': {
        type: '空调设备',
        power: 1500,
        status: '运行中',
        brand: 'Daikin',
        model: 'VRV-X',
        installDate: '2023-12-01',
        lastMaintenance: '2024-05-10'
    },
    'chair': {
        type: '办公家具',
        material: '网布人体工学椅',
        brand: 'Herman Miller',
        purchaseDate: '2024-02-20'
    },
    'desk': {
        type: '办公家具',
        material: '实木办公桌',
        brand: 'Steelcase',
        purchaseDate: '2024-02-20'
    },
    'default': {
        type: '未知设备',
        status: '正常',
        note: '点击查看详情'
    }
};

// 初始化场景
function init() {
    const container = document.getElementById('canvas-container');

    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);

    // 创建相机
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(20, 15, 20);

    // 创建渲染器 - 使用 WebGL2 (WebGPU 需要浏览器支持)
    const rendererOptions = {
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    };

    // 检查 WebGPU 支持
    if (navigator.gpu) {
        console.log('WebGPU 可用');
        // Three.js 0.185+ 的 WebGPURenderer 实验性支持
        // 目前使用 WebGLRenderer 作为稳定方案
    }

    renderer = new THREE.WebGLRenderer(rendererOptions);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // 初始化轨道控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;

    // 初始化 RectAreaLight 库
    RectAreaLightUniformsLib.init();

    // 加载 HDR 环境贴图
    loadHDREnvironment();

    // 创建基础光照
    setupBaseLighting();

    // 加载 GLB 模型
    loadGLBModel();

    // 事件监听
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onMouseClick);
    renderer.domElement.addEventListener('dblclick', onDoubleClick);

    // 启动渲染循环
    animate();
}

// 加载 HDR 环境贴图
function loadHDREnvironment() {
    const rgbeLoader = new RGBELoader();
    
    // 使用在线 HDR 资源或创建程序化 HDR
    rgbeLoader.load(
        'https://dl.polyhaven.com/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_puresky_1k.hdr',
        function(texture) {
            hdrTexture = texture;
            hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
            
            scene.environment = hdrTexture;
            scene.background = new THREE.Color(0x0a0a1a);
            
            console.log('HDR 环境贴图加载完成');
        },
        undefined,
        function(error) {
            console.warn('HDR 加载失败，使用备用方案:', error);
            createProceduralHDR();
        }
    );
}

// 创建程序化 HDR 备用方案
function createProceduralHDR() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // 创建渐变背景
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(0.5, '#0a0a1a');
    gradient.addColorStop(1, '#050510');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    
    scene.environment = texture;
    scene.background = new THREE.Color(0x0a0a1a);
}

// 设置基础光照
function setupBaseLighting() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    ambientLight.name = 'ambientLight';
    scene.add(ambientLight);

    // 主方向光（模拟太阳光）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.name = 'mainDirectionalLight';
    scene.add(directionalLight);

    // 补光
    const fillLight = new THREE.DirectionalLight(0x4466ff, 0.2);
    fillLight.position.set(-50, 20, -50);
    fillLight.name = 'fillLight';
    scene.add(fillLight);
}

// 加载 GLB 模型
function loadGLBModel() {
    const loader = new GLTFLoader();
    
    // 尝试加载用户提供的模型
    loader.load(
        '/models/unamed.glb',
        function(gltf) {
            gltfModel = gltf.scene;
            
            // 遍历模型，设置阴影和设备信息
            gltfModel.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // 根据名称识别设备类型
                    identifyDevice(child);
                }
            });

            // 居中模型
            centerModel(gltfModel);
            
            // 添加区域灯光到模型的灯具位置
            addAreaLightsToModel(gltfModel);
            
            scene.add(gltfModel);
            
            console.log('GLB 模型加载完成');
            hideLoader();
            updateDeviceStats();
        },
        undefined,
        function(error) {
            console.warn('模型加载失败，创建演示场景:', error);
            createDemoScene();
            hideLoader();
        }
    );
}

// 识别设备类型
function identifyDevice(mesh) {
    const name = mesh.name.toLowerCase();
    let deviceType = 'default';
    
    if (name.includes('light') || name.includes('lamp') || name.includes('灯')) {
        deviceType = 'light';
        // 为灯具添加发光效果
        if (mesh.material) {
            mesh.material.emissive = new THREE.Color(0xffffaa);
            mesh.material.emissiveIntensity = lightingSystem.enabled ? 0.5 : 0;
        }
    } else if (name.includes('ac') || name.includes('air') || name.includes('condition') || name.includes('空调')) {
        deviceType = 'ac';
    } else if (name.includes('chair') || name.includes('seat') || name.includes('椅')) {
        deviceType = 'chair';
    } else if (name.includes('desk') || name.includes('table') || name.includes('桌')) {
        deviceType = 'desk';
    }
    
    // 存储设备信息
    mesh.userData.deviceType = deviceType;
    mesh.userData.deviceInfo = deviceDatabase[deviceType] || deviceDatabase.default;
    mesh.userData.originalMaterial = mesh.material.clone();
    
    devices.push(mesh);
}

// 居中模型
function centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    model.position.x += (model.position.x - center.x);
    model.position.z += (model.position.z - center.z);
    model.position.y += (model.position.y - box.min.y);
    
    // 调整相机位置以适应模型大小
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5;
    
    camera.position.set(cameraZ * 0.7, cameraZ * 0.5, cameraZ * 0.7);
    controls.target.set(0, size.y / 4, 0);
    controls.update();
}

// 为模型添加区域灯光
function addAreaLightsToModel(model) {
    // 查找灯具位置并添加矩形光
    model.traverse(function(child) {
        const name = child.name.toLowerCase();
        if (name.includes('light') || name.includes('lamp') || name.includes('灯')) {
            // 在灯具位置添加点光源
            const light = new THREE.PointLight(0xffffaa, 1, 20);
            light.position.copy(child.position);
            light.castShadow = true;
            light.name = 'areaLight_' + child.name;
            scene.add(light);
            
            child.userData.lightRef = light;
        }
    });
}

// 创建演示场景（当模型加载失败时）
function createDemoScene() {
    console.log('创建演示场景');
    
    // 地面
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333344,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData.deviceType = 'floor';
    scene.add(floor);
    
    // 创建房间墙壁
    createWalls();
    
    // 创建简单桌椅
    createFurniture();
    
    // 创建灯具
    createLights();
    
    // 创建空调设备
    createACUnits();
    
    updateDeviceStats();
}

// 创建墙壁
function createWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444455,
        roughness: 0.9,
        side: THREE.DoubleSide
    });
    
    // 后墙
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(50, 10, 1),
        wallMaterial
    );
    backWall.position.set(0, 5, -25);
    backWall.receiveShadow = true;
    scene.add(backWall);
    
    // 左墙
    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(1, 10, 50),
        wallMaterial
    );
    leftWall.position.set(-25, 5, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);
}

// 创建家具
function createFurniture() {
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    // 创建几张桌子
    for (let i = 0; i < 4; i++) {
        const deskGeo = new THREE.BoxGeometry(4, 0.2, 2);
        const desk = new THREE.Mesh(deskGeo, deskMaterial);
        desk.position.set(
            (i % 2) * 10 - 5,
            0.7,
            Math.floor(i / 2) * 10 - 5
        );
        desk.castShadow = true;
        desk.receiveShadow = true;
        desk.userData.deviceType = 'desk';
        desk.userData.deviceInfo = deviceDatabase.desk;
        scene.add(desk);
        devices.push(desk);
        
        // 桌腿
        const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7);
        for (let j = 0; j < 4; j++) {
            const leg = new THREE.Mesh(legGeo, deskMaterial);
            leg.position.set(
                desk.position.x + (j % 2 === 0 ? -1.8 : 1.8),
                0.35,
                desk.position.z + (j < 2 ? -0.8 : 0.8)
            );
            leg.castShadow = true;
            scene.add(leg);
        }
        
        // 椅子
        const chairGeo = new THREE.BoxGeometry(1.5, 2, 1.5);
        const chair = new THREE.Mesh(chairGeo, chairMaterial);
        chair.position.set(
            desk.position.x,
            1,
            desk.position.z + 2.5
        );
        chair.castShadow = true;
        chair.userData.deviceType = 'chair';
        chair.userData.deviceInfo = deviceDatabase.chair;
        scene.add(chair);
        devices.push(chair);
    }
}

// 创建灯具
function createLights() {
    const positions = [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        { x: -10, z: 0 },
        { x: 0, z: 10 },
        { x: 0, z: -10 }
    ];
    
    positions.forEach((pos, index) => {
        // 灯具模型
        const lightFixtureGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 16);
        const lightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffaa,
            emissive: 0xffffaa,
            emissiveIntensity: lightingSystem.enabled ? 0.8 : 0
        });
        const lightFixture = new THREE.Mesh(lightFixtureGeo, lightMaterial);
        lightFixture.position.set(pos.x, 8, pos.z);
        lightFixture.castShadow = true;
        lightFixture.userData.deviceType = 'light';
        lightFixture.userData.deviceInfo = deviceDatabase.light;
        scene.add(lightFixture);
        devices.push(lightFixture);
        
        // 实际光源
        const pointLight = new THREE.PointLight(0xffffaa, 2, 30);
        pointLight.position.set(pos.x, 7.5, pos.z);
        pointLight.castShadow = true;
        pointLight.intensity = lightingSystem.enabled ? 2 : 0;
        scene.add(pointLight);
        
        lightFixture.userData.lightRef = pointLight;
    });
}

// 创建空调设备
function createACUnits() {
    const acPositions = [
        { x: -20, y: 6, z: -20 },
        { x: 20, y: 6, z: 20 }
    ];
    
    acPositions.forEach((pos) => {
        const acGeo = new THREE.BoxGeometry(2, 1, 1);
        const acMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const acUnit = new THREE.Mesh(acGeo, acMaterial);
        acUnit.position.set(pos.x, pos.y, pos.z);
        acUnit.castShadow = true;
        acUnit.userData.deviceType = 'ac';
        acUnit.userData.deviceInfo = deviceDatabase.ac;
        scene.add(acUnit);
        devices.push(acUnit);
        
        // 气流效果粒子
        createAirflowEffect(pos);
    });
}

// 创建气流效果
function createAirflowEffect(position) {
    const particleCount = 50;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = position.x + (Math.random() - 0.5) * 3;
        positions[i * 3 + 1] = position.y - Math.random() * 5;
        positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 3;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x88ccff,
        size: 0.1,
        transparent: true,
        opacity: acSystem.enabled ? 0.6 : 0
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.userData.isAirflow = true;
    scene.add(particleSystem);
}

// 隐藏加载动画
function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

// 窗口大小调整
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 鼠标点击事件
function onMouseClick(event) {
    // 计算鼠标位置
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // 射线检测
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(devices);
    
    if (intersects.length > 0) {
        const object = intersects[0].object;
        
        // 如果已经选中了同一个物体，取消选中
        if (selectedObject === object) {
            deselectObject();
            return;
        }
        
        // 取消之前的选择
        deselectObject();
        
        // 选中新物体
        selectObject(object);
    } else {
        // 点击空白处取消选择
        deselectObject();
    }
}

// 双击事件 - 聚焦物体
function onDoubleClick(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(devices);
    
    if (intersects.length > 0) {
        const object = intersects[0].object;
        focusOnObject(object);
    }
}

// 选择物体
function selectObject(object) {
    selectedObject = object;
    
    // 高亮显示
    if (object.material) {
        object.material.emissive = new THREE.Color(0x00d4ff);
        object.material.emissiveIntensity = 0.5;
    }
    
    // 显示信息面板
    showDeviceInfo(object);
}

// 取消选择
function deselectObject() {
    if (selectedObject && selectedObject.material) {
        selectedObject.material.emissive = new THREE.Color(0x000000);
        selectedObject.material.emissiveIntensity = 0;
    }
    selectedObject = null;
    
    // 隐藏信息面板
    hideDeviceInfo();
}

// 聚焦物体
function focusOnObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // 平滑移动相机
    const targetPos = new THREE.Vector3(
        center.x + size.x * 3,
        center.y + size.y * 2,
        center.z + size.z * 3
    );
    
    camera.position.lerp(targetPos, 0.5);
    controls.target.lerp(center, 0.5);
    controls.update();
}

// 显示设备信息
function showDeviceInfo(object) {
    const panel = document.getElementById('info-panel');
    const nameEl = document.getElementById('device-name');
    const contentEl = document.getElementById('device-info-content');
    
    const deviceType = object.userData.deviceType || 'default';
    const info = object.userData.deviceInfo || deviceDatabase.default;
    
    nameEl.textContent = `${deviceType.toUpperCase()} - ${info.type}`;
    
    let html = '';
    for (const [key, value] of Object.entries(info)) {
        if (key !== 'type') {
            const label = getLabelForKey(key);
            html += `
                <div class="info-item">
                    <div class="info-item-label">${label}</div>
                    <div class="info-item-value">${value}${key === 'power' ? ' W' : ''}${key === 'temperature' ? '°C' : ''}</div>
                </div>
            `;
        }
    }
    
    contentEl.innerHTML = html;
    panel.classList.add('show');
}

// 隐藏设备信息
function hideDeviceInfo() {
    const panel = document.getElementById('info-panel');
    panel.classList.remove('show');
}

// 获取键的中文标签
function getLabelForKey(key) {
    const labels = {
        power: '功率',
        status: '状态',
        brand: '品牌',
        model: '型号',
        installDate: '安装日期',
        lastMaintenance: '最后维护',
        material: '材质',
        purchaseDate: '购买日期',
        note: '备注'
    };
    return labels[key] || key;
}

// 更新设备统计
function updateDeviceStats() {
    const total = devices.length;
    const active = devices.filter(d => d.userData.deviceType === 'light' || d.userData.deviceType === 'ac').length;
    const totalPower = devices.reduce((sum, d) => {
        const info = d.userData.deviceInfo;
        return sum + (info.power || 0);
    }, 0);
    
    document.getElementById('total-devices').textContent = total;
    document.getElementById('active-devices').textContent = active;
    document.getElementById('total-power').textContent = `${(totalPower / 1000).toFixed(1)} kW`;
}

// 更新照明系统
function updateLighting(enabled, brightness) {
    lightingSystem.enabled = enabled;
    lightingSystem.brightness = brightness / 100;
    
    // 更新所有灯具
    devices.forEach(device => {
        if (device.userData.deviceType === 'light' && device.userData.lightRef) {
            const light = device.userData.lightRef;
            light.intensity = enabled ? brightness / 50 : 0;
        }
        
        if (device.userData.deviceType === 'light' && device.material) {
            device.material.emissiveIntensity = enabled ? brightness / 100 : 0;
        }
    });
    
    // 更新照度显示
    const lux = enabled ? Math.round(300 + brightness * 4) : 50;
    document.getElementById('lux-value').textContent = `${lux} lx`;
}

// 更新空调系统
function updateAC(enabled, temperature) {
    acSystem.enabled = enabled;
    acSystem.temperature = temperature;
    
    // 更新气流效果
    scene.traverse(object => {
        if (object.userData.isAirflow && object.material) {
            object.material.opacity = enabled ? 0.6 : 0;
        }
    });
    
    // 更新温度显示
    document.getElementById('avg-temp').textContent = `${temperature}°C`;
}

// 动画循环
function animate() {
    animationId = requestAnimationFrame(animate);
    
    controls.update();
    
    // 自动旋转
    if (autoRotate) {
        controls.autoRotate = true;
        controls.update();
    } else {
        controls.autoRotate = false;
    }
    
    // 更新气流粒子动画
    scene.traverse(object => {
        if (object.userData.isAirflow && object.geometry) {
            const positions = object.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 0.05;
                if (positions[i + 1] < 0) {
                    positions[i + 1] = 6;
                }
            }
            object.geometry.attributes.position.needsUpdate = true;
        }
    });
    
    renderer.render(scene, camera);
}

// 清理
function cleanup() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    renderer.dispose();
    controls.dispose();
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    init();
    
    // 绑定控制事件
    document.getElementById('lighting-toggle').addEventListener('click', function() {
        this.classList.toggle('active');
        const enabled = this.classList.contains('active');
        const brightness = document.getElementById('lighting-brightness').value;
        updateLighting(enabled, brightness);
    });
    
    document.getElementById('lighting-brightness').addEventListener('input', function() {
        document.getElementById('brightness-value').textContent = this.value;
        const enabled = document.getElementById('lighting-toggle').classList.contains('active');
        updateLighting(enabled, this.value);
    });
    
    document.getElementById('ac-toggle').addEventListener('click', function() {
        this.classList.toggle('active');
        const enabled = this.classList.contains('active');
        const temp = document.getElementById('ac-temperature').value;
        updateAC(enabled, temp);
    });
    
    document.getElementById('ac-temperature').addEventListener('input', function() {
        document.getElementById('temperature-value').textContent = this.value;
        const enabled = document.getElementById('ac-toggle').classList.contains('active');
        updateAC(enabled, this.value);
    });
    
    document.getElementById('auto-rotate').addEventListener('click', function() {
        this.classList.toggle('active');
        autoRotate = this.classList.contains('active');
    });
    
    document.getElementById('reset-view').addEventListener('click', function() {
        camera.position.set(20, 15, 20);
        controls.target.set(0, 0, 0);
        controls.update();
    });
    
    document.getElementById('close-info').addEventListener('click', function() {
        deselectObject();
    });
});

// 页面卸载时清理
window.addEventListener('unload', cleanup);
