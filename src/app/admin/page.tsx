'use client';
import { useState, useEffect, useCallback } from 'react';

// === 类型定义 ===
interface Project { id: number; province: string; city: string; name: string; address: string; created_at: string; }
interface Station { id: number; project_id: number; name: string; location: string; created_at: string; }
interface Device {
  id: number; station_id: number; project_id: number; device_type: string;
  chiller_subtype: string | null; name: string; code: string; location: string;
  running_status: string; is_fault: number; is_offline: number; created_at: string;
}

const DEVICE_TYPE_LABELS: Record<string, string> = {
  chiller: '制冷机', frozen_pump: '冷冻泵', cooling_pump: '冷却泵', cooling_tower: '冷却塔', ahu: '风柜',
};
const CHILLER_SUBTYPES: Record<string, string> = { screw: '螺杆式', centrifugal: '离心式', magnetic: '磁悬浮' };
const STATUS_LABELS: Record<string, string> = { running: '运行', stopped: '停止', standby: '待机' };

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: '13px', background: '#0a1a2e', color: '#e8f4ff',
  border: '1px solid rgba(0,212,255,0.3)', borderRadius: '4px', outline: 'none', width: '100%',
};
const btnStyle: React.CSSProperties = {
  padding: '6px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  border: 'none', borderRadius: '4px', transition: 'all 0.2s',
};
const btnPrimary: React.CSSProperties = { ...btnStyle, background: '#00d4ff', color: '#02070f' };
const btnDanger: React.CSSProperties = { ...btnStyle, background: '#ff4d6d', color: '#fff' };
const cardStyle: React.CSSProperties = {
  background: 'rgba(8,18,38,0.8)', border: '1px solid rgba(0,212,255,0.2)',
  borderRadius: '8px', padding: '16px', backdropFilter: 'blur(10px)',
};

export default function AdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  // === 加载项目列表 ===
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/projects');
      const json = await res.json();
      if (json.success) setProjects(json.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // === 加载冷站 ===
  const loadStations = useCallback(async (projectId: number) => {
    try {
      const res = await fetch(`/api/admin/stations?project_id=${projectId}`);
      const json = await res.json();
      if (json.success) setStations(json.data);
    } catch (e) { console.error(e); }
  }, []);

  // === 加载设备 ===
  const loadDevices = useCallback(async (stationId: number) => {
    try {
      const res = await fetch(`/api/admin/devices?station_id=${stationId}`);
      const json = await res.json();
      if (json.success) setDevices(json.data);
    } catch (e) { console.error(e); }
  }, []);

  // 选中项目时加载冷站
  useEffect(() => {
    if (selectedProject) {
      loadStations(selectedProject.id);
      setSelectedStation(null);
      setDevices([]);
    }
  }, [selectedProject, loadStations]);

  // 选中冷站时加载设备
  useEffect(() => {
    if (selectedStation) loadDevices(selectedStation.id);
  }, [selectedStation, loadDevices]);

  return (
    <div style={{ minHeight: '100vh', background: '#050d1a', color: '#e8f4ff', padding: '20px', fontFamily: 'Rajdhani, sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px', color: '#00d4ff' }}>🛠 空调节能后台管理</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 300px 1fr', gap: '16px', alignItems: 'start' }}>
        {/* 左栏：项目列表 */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>📁 项目列表</h2>
          <ProjectForm onCreated={loadProjects} />
          <div style={{ marginTop: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => setSelectedProject(p)} style={{
                padding: '8px 10px', marginBottom: '4px', borderRadius: '4px', cursor: 'pointer',
                background: selectedProject?.id === p.id ? 'rgba(0,212,255,0.15)' : 'transparent',
                border: '1px solid ' + (selectedProject?.id === p.id ? 'rgba(0,212,255,0.4)' : 'transparent'),
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: '#8aa5c4' }}>{p.province} › {p.city}</div>
              </div>
            ))}
            {projects.length === 0 && <div style={{ fontSize: '12px', color: '#4a6485', padding: '8px' }}>暂无项目</div>}
          </div>
        </div>

        {/* 中栏：冷站列表 */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>❄ 冷站列表 {selectedProject && `· ${selectedProject.name}`}</h2>
          {selectedProject ? (
            <>
              <StationForm projectId={selectedProject.id} onCreated={() => loadStations(selectedProject.id)} />
              <div style={{ marginTop: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                {stations.map(s => (
                  <div key={s.id} onClick={() => setSelectedStation(s)} style={{
                    padding: '8px 10px', marginBottom: '4px', borderRadius: '4px', cursor: 'pointer',
                    background: selectedStation?.id === s.id ? 'rgba(0,212,255,0.15)' : 'transparent',
                    border: '1px solid ' + (selectedStation?.id === s.id ? 'rgba(0,212,255,0.4)' : 'transparent'),
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: '11px', color: '#8aa5c4' }}>{s.location || '无位置'}</div>
                  </div>
                ))}
                {stations.length === 0 && <div style={{ fontSize: '12px', color: '#4a6485', padding: '8px' }}>暂无冷站</div>}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: '#4a6485', padding: '20px 0', textAlign: 'center' }}>← 请先选择项目</div>
          )}
        </div>

        {/* 右栏：设备列表 */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>⚙ 设备列表 {selectedStation && `· ${selectedStation.name}`}</h2>
          {selectedStation && selectedProject ? (
            <>
              <DeviceForm stationId={selectedStation.id} projectId={selectedProject.id} onCreated={() => loadDevices(selectedStation.id)} />
              <div style={{ marginTop: '12px' }}>
                {devices.map(d => (
                  <DeviceCard key={d.id} device={d} onDeleted={() => loadDevices(selectedStation.id)} />
                ))}
                {devices.length === 0 && <div style={{ fontSize: '12px', color: '#4a6485', padding: '8px' }}>暂无设备</div>}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: '#4a6485', padding: '20px 0', textAlign: 'center' }}>← 请先选择冷站</div>
          )}
        </div>
      </div>
    </div>
  );
}

// === 项目表单 ===
function ProjectForm({ onCreated }: { onCreated: () => void }) {
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const submit = async () => {
    if (!province || !city || !name) return;
    await fetch('/api/admin/projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ province, city, name, address }),
    });
    setProvince(''); setCity(''); setName(''); setAddress('');
    onCreated();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
      <input style={inputStyle} placeholder="省份" value={province} onChange={e => setProvince(e.target.value)} />
      <input style={inputStyle} placeholder="城市" value={city} onChange={e => setCity(e.target.value)} />
      <input style={inputStyle} placeholder="项目名称" value={name} onChange={e => setName(e.target.value)} />
      <input style={inputStyle} placeholder="地址(选填)" value={address} onChange={e => setAddress(e.target.value)} />
      <button style={{ ...btnPrimary, gridColumn: '1/3' }} onClick={submit}>+ 添加项目</button>
    </div>
  );
}

// === 冷站表单 ===
function StationForm({ projectId, onCreated }: { projectId: number; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const submit = async () => {
    if (!name) return;
    await fetch('/api/admin/stations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, name, location }),
    });
    setName(''); setLocation('');
    onCreated();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
      <input style={inputStyle} placeholder="冷站名称" value={name} onChange={e => setName(e.target.value)} />
      <input style={inputStyle} placeholder="位置(选填)" value={location} onChange={e => setLocation(e.target.value)} />
      <button style={{ ...btnPrimary, gridColumn: '1/3' }} onClick={submit}>+ 添加冷站</button>
    </div>
  );
}

// === 设备表单 ===
function DeviceForm({ stationId, projectId, onCreated }: { stationId: number; projectId: number; onCreated: () => void }) {
  const [deviceType, setDeviceType] = useState('chiller');
  const [chillerSubtype, setChillerSubtype] = useState('screw');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');

  const submit = async () => {
    if (!name || !code) return;
    await fetch('/api/admin/devices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        station_id: stationId, project_id: projectId, device_type: deviceType,
        chiller_subtype: deviceType === 'chiller' ? chillerSubtype : null,
        name, code, location,
      }),
    });
    setName(''); setCode(''); setLocation('');
    onCreated();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
      <select style={inputStyle} value={deviceType} onChange={e => setDeviceType(e.target.value)}>
        {Object.entries(DEVICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {deviceType === 'chiller' && (
        <select style={inputStyle} value={chillerSubtype} onChange={e => setChillerSubtype(e.target.value)}>
          {Object.entries(CHILLER_SUBTYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      )}
      <input style={inputStyle} placeholder="设备名称" value={name} onChange={e => setName(e.target.value)} />
      <input style={inputStyle} placeholder="设备编号" value={code} onChange={e => setCode(e.target.value)} />
      <input style={inputStyle} placeholder="位置(选填)" value={location} onChange={e => setLocation(e.target.value)} />
      <button style={{ ...btnPrimary, gridColumn: `1/${deviceType === 'chiller' ? '4' : '4'}` }} onClick={submit}>+ 添加设备</button>
    </div>
  );
}

// === 设备卡片 ===
function DeviceCard({ device, onDeleted }: { device: Device; onDeleted: () => void }) {
  const [showParams, setShowParams] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  const loadMetrics = async () => {
    const res = await fetch(`/api/admin/metrics?device_id=${device.id}`);
    const json = await res.json();
    if (json.success) setMetrics(json.data);
  };

  const deleteDevice = async () => {
    if (!confirm(`确认删除设备「${device.name}」？`)) return;
    await fetch(`/api/admin/devices?id=${device.id}`, { method: 'DELETE' });
    onDeleted();
  };

  const typeLabel = DEVICE_TYPE_LABELS[device.device_type] || device.device_type;
  const subtypeLabel = device.chiller_subtype ? ` · ${CHILLER_SUBTYPES[device.chiller_subtype] || ''}` : '';
  const statusColor = device.is_offline ? '#4a6485' : device.is_fault ? '#ff4d6d' : device.running_status === 'running' ? '#00ff88' : '#ffaa44';

  return (
    <div style={{ padding: '10px', marginBottom: '6px', borderRadius: '4px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{device.name}</span>
          <span style={{ fontSize: '11px', color: '#8aa5c4', marginLeft: '8px' }}>{typeLabel}{subtypeLabel}</span>
          <span style={{ fontSize: '11px', color: '#4a6485', marginLeft: '8px' }}>#{device.code}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: statusColor, fontWeight: 600 }}>
            {device.is_offline ? '离线' : device.is_fault ? '故障' : STATUS_LABELS[device.running_status] || device.running_status}
          </span>
          <button style={{ ...btnStyle, padding: '2px 8px', fontSize: '11px', background: 'rgba(0,212,255,0.2)', color: '#00d4ff' }}
            onClick={() => { setShowParams(!showParams); if (!showParams) loadMetrics(); }}>
            {showParams ? '收起' : '参数'}
          </button>
          <button style={{ ...btnDanger, padding: '2px 8px', fontSize: '11px' }} onClick={deleteDevice}>删除</button>
        </div>
      </div>
      {device.location && <div style={{ fontSize: '11px', color: '#4a6485', marginTop: '4px' }}>📍 {device.location}</div>}
      {showParams && (
        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
          {metrics ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
              {Object.entries(metrics.params || {}).map(([k, v]: any) => (
                <div key={k} style={{ fontSize: '11px' }}>
                  <span style={{ color: '#8aa5c4' }}>{k}: </span>
                  <span style={{ color: '#00ffcc', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ fontSize: '10px', color: '#4a6485', gridColumn: '1/4' }}>时间: {metrics.timestamp}</div>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#4a6485' }}>暂无时序数据</div>
          )}
        </div>
      )}
    </div>
  );
}
