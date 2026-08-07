'use client';
import { useState, useEffect, useCallback } from 'react';

// === 类型 ===
interface Project { id: number; province: string; city: string; name: string; address: string; }
interface Floor { id: number; project_id: number; name: string; sort_order: number; }
interface Room { id: number; floor_id: number; project_id: number; name: string; }
interface Station { id: number; project_id: number; name: string; location: string; }
interface Device {
  id: number; project_id: number; station_id: number | null; floor_id: number | null; room_id: number | null;
  device_type: string; chiller_subtype: string | null; name: string; code: string; location: string;
  running_status: string; is_fault: number; is_offline: number;
}
interface Meter { id: number; project_id: number; meter_level: number; name: string; code: string; location: string; installed_at: string; }
interface EnergyMonthly { id: number; project_id: number; year: number; month: number; electricity_kwh: number; cost_cny: number; }

const DEVICE_TYPE_LABELS: Record<string, string> = {
  chiller: '制冷机', frozen_pump: '冷冻泵', cooling_pump: '冷却泵', cooling_tower: '冷却塔', ahu: '风柜',
};
const CHILLER_SUBTYPES: Record<string, string> = { screw: '螺杆式', centrifugal: '离心式', magnetic: '磁悬浮' };
const STATUS_LABELS: Record<string, string> = { running: '运行', stopped: '停止', standby: '待机' };
const METER_LEVEL_LABELS: Record<number, string> = { 1: '一级(总表)', 2: '二级(区域表)', 3: '三级(终端表)' };

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: '12px', background: '#0a1a2e', color: '#e8f4ff',
  border: '1px solid rgba(0,212,255,0.3)', borderRadius: '4px', outline: 'none', width: '100%',
};
const btnPrimary: React.CSSProperties = {
  padding: '5px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  border: 'none', borderRadius: '4px', background: '#00d4ff', color: '#02070f',
};
const btnDanger: React.CSSProperties = {
  padding: '3px 8px', fontSize: '11px', cursor: 'pointer',
  border: 'none', borderRadius: '4px', background: '#ff4d6d', color: '#fff',
};
const cardStyle: React.CSSProperties = {
  background: 'rgba(8,18,38,0.8)', border: '1px solid rgba(0,212,255,0.2)',
  borderRadius: '8px', padding: '14px', backdropFilter: 'blur(10px)',
};
const sectionTitle: React.CSSProperties = { fontSize: '15px', marginBottom: '10px', color: '#00d4ff', fontWeight: 600 };

export default function AdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<'structure' | 'energy'>('structure');

  const loadProjects = useCallback(async () => {
    const res = await fetch('/api/admin/projects');
    const json = await res.json();
    if (json.success) setProjects(json.data);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  return (
    <div style={{ minHeight: '100vh', background: '#050d1a', color: '#e8f4ff', padding: '20px', fontFamily: 'Rajdhani, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', color: '#00d4ff' }}>🛠 空调节能后台管理</h1>
        <a href="/" style={{ fontSize: '13px', color: '#8aa5c4', textDecoration: 'none' }}>← 返回驾驶舱</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', alignItems: 'start' }}>
        {/* 左栏：项目列表 */}
        <div style={cardStyle}>
          <h2 style={sectionTitle}>📁 项目列表</h2>
          <ProjectForm onCreated={loadProjects} />
          <div style={{ marginTop: '10px', maxHeight: '500px', overflowY: 'auto' }}>
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

        {/* 右栏：Tab 切换 */}
        <div style={cardStyle}>
          {selectedProject ? (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button onClick={() => setTab('structure')} style={{
                  ...btnPrimary, background: tab === 'structure' ? '#00d4ff' : 'rgba(0,212,255,0.15)',
                  color: tab === 'structure' ? '#02070f' : '#00d4ff',
                }}>🏢 楼层/房间/设备</button>
                <button onClick={() => setTab('energy')} style={{
                  ...btnPrimary, background: tab === 'energy' ? '#00d4ff' : 'rgba(0,212,255,0.15)',
                  color: tab === 'energy' ? '#02070f' : '#00d4ff',
                }}>⚡ 能源管理</button>
              </div>
              {tab === 'structure' ? <StructureTab project={selectedProject} /> : <EnergyTab project={selectedProject} />}
            </>
          ) : (
            <div style={{ fontSize: '13px', color: '#4a6485', padding: '40px 0', textAlign: 'center' }}>← 请先选择项目</div>
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
    await fetch('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ province, city, name, address }) });
    setProvince(''); setCity(''); setName(''); setAddress('');
    onCreated();
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
      <input style={inputStyle} placeholder="省份" value={province} onChange={e => setProvince(e.target.value)} />
      <input style={inputStyle} placeholder="城市" value={city} onChange={e => setCity(e.target.value)} />
      <input style={inputStyle} placeholder="项目名" value={name} onChange={e => setName(e.target.value)} />
      <input style={inputStyle} placeholder="地址" value={address} onChange={e => setAddress(e.target.value)} />
      <button style={{ ...btnPrimary, gridColumn: '1/3' }} onClick={submit}>+ 添加项目</button>
    </div>
  );
}

// === 结构 Tab（楼层/房间/设备树） ===
function StructureTab({ project }: { project: Project }) {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [expandedFloor, setExpandedFloor] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Record<number, Room[]>>({});
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [stations, setStations] = useState<Station[]>([]);

  const loadFloors = useCallback(async () => {
    const res = await fetch(`/api/admin/floors?project_id=${project.id}`);
    const json = await res.json();
    if (json.success) setFloors(json.data);
  }, [project.id]);

  const loadStations = useCallback(async () => {
    const res = await fetch(`/api/admin/stations?project_id=${project.id}`);
    const json = await res.json();
    if (json.success) setStations(json.data);
  }, [project.id]);

  useEffect(() => { loadFloors(); loadStations(); }, [loadFloors, loadStations]);

  const toggleFloor = async (floor: Floor) => {
    if (expandedFloor === floor.id) {
      setExpandedFloor(null);
    } else {
      setExpandedFloor(floor.id);
      if (!rooms[floor.id]) {
        const res = await fetch(`/api/admin/rooms?floor_id=${floor.id}`);
        const json = await res.json();
        if (json.success) setRooms(prev => ({ ...prev, [floor.id]: json.data }));
      }
    }
  };

  const selectRoom = async (room: Room) => {
    setSelectedRoom(room);
    const res = await fetch(`/api/admin/devices?project_id=${project.id}`);
    const json = await res.json();
    if (json.success) {
      setDevices(json.data.filter((d: Device) => d.room_id === room.id));
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '12px' }}>
      {/* 楼层/房间树 */}
      <div>
        <FloorForm projectId={project.id} onCreated={loadFloors} />
        <div style={{ marginTop: '8px', maxHeight: '400px', overflowY: 'auto' }}>
          {floors.map(f => (
            <div key={f.id}>
              <div onClick={() => toggleFloor(f)} style={{
                padding: '6px 8px', cursor: 'pointer', borderRadius: '4px',
                background: expandedFloor === f.id ? 'rgba(0,212,255,0.1)' : 'transparent',
                fontSize: '13px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>🏢 {f.name}</span>
                <span style={{ fontSize: '10px', color: '#4a6485' }}>{expandedFloor === f.id ? '▼' : '▶'}</span>
              </div>
              {expandedFloor === f.id && rooms[f.id]?.map(r => (
                <div key={r.id} onClick={() => selectRoom(r)} style={{
                  padding: '5px 8px 5px 24px', cursor: 'pointer', borderRadius: '4px',
                  background: selectedRoom?.id === r.id ? 'rgba(0,212,255,0.15)' : 'transparent',
                  fontSize: '12px', color: '#8aa5c4',
                }}>🚪 {r.name}</div>
              ))}
              {expandedFloor === f.id && (
                <div style={{ paddingLeft: '24px' }}>
                  <RoomForm floorId={f.id} projectId={project.id} onCreated={async () => {
                    const res = await fetch(`/api/admin/rooms?floor_id=${f.id}`);
                    const json = await res.json();
                    if (json.success) setRooms(prev => ({ ...prev, [f.id]: json.data }));
                  }} />
                </div>
              )}
            </div>
          ))}
          {floors.length === 0 && <div style={{ fontSize: '12px', color: '#4a6485', padding: '8px' }}>暂无楼层</div>}
        </div>
      </div>

      {/* 设备列表 */}
      <div>
        {selectedRoom ? (
          <>
            <div style={{ fontSize: '13px', color: '#00ffcc', marginBottom: '8px' }}>📍 {selectedRoom.name} 的设备</div>
            <DeviceForm projectId={project.id} roomId={selectedRoom.id} stations={stations} onCreated={async () => {
              const res = await fetch(`/api/admin/devices?project_id=${project.id}`);
              const json = await res.json();
              if (json.success) setDevices(json.data.filter((d: Device) => d.room_id === selectedRoom.id));
            }} />
            <div style={{ marginTop: '10px' }}>
              {devices.map(d => <DeviceCard key={d.id} device={d} onDeleted={async () => {
                const res = await fetch(`/api/admin/devices?project_id=${project.id}`);
                const json = await res.json();
                if (json.success) setDevices(json.data.filter((dd: Device) => dd.room_id === selectedRoom.id));
              }} />)}
              {devices.length === 0 && <div style={{ fontSize: '12px', color: '#4a6485', padding: '8px' }}>暂无设备</div>}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '12px', color: '#4a6485', padding: '20px 0', textAlign: 'center' }}>← 选择房间查看设备</div>
        )}
      </div>
    </div>
  );
}

// === 能源 Tab ===
function EnergyTab({ project }: { project: Project }) {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [meterStats, setMeterStats] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const [energyData, setEnergyData] = useState<EnergyMonthly[]>([]);
  const [stats, setStats] = useState<any>(null);

  const loadAll = useCallback(async () => {
    const [metersRes, energyRes, statsRes] = await Promise.all([
      fetch(`/api/admin/meters?project_id=${project.id}`).then(r => r.json()),
      fetch(`/api/admin/energy?project_id=${project.id}`).then(r => r.json()),
      fetch(`/api/admin/energy?project_id=${project.id}&stats=1`).then(r => r.json()),
    ]);
    if (metersRes.success) { setMeters(metersRes.data); setMeterStats(metersRes.stats); }
    if (energyRes.success) setEnergyData(energyRes.data);
    if (statsRes.success) setStats(statsRes.data);
  }, [project.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <div>
      {/* 表计统计 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {[1, 2, 3].map(level => (
          <div key={level} style={{ padding: '12px', borderRadius: '6px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#8aa5c4' }}>{METER_LEVEL_LABELS[level]}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#00d4ff', fontFamily: 'Orbitron' }}>{meterStats[level] || 0}</div>
            <div style={{ fontSize: '10px', color: '#4a6485' }}>个表计</div>
          </div>
        ))}
      </div>

      {/* 添加表计 */}
      <MeterForm projectId={project.id} onCreated={loadAll} />

      {/* 表计列表 */}
      <div style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto' }}>
        {meters.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', marginBottom: '4px', borderRadius: '4px', background: 'rgba(0,212,255,0.05)' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>{m.name}</span>
              <span style={{ fontSize: '11px', color: '#8aa5c4', marginLeft: '8px' }}>{METER_LEVEL_LABELS[m.meter_level]}</span>
              <span style={{ fontSize: '11px', color: '#4a6485', marginLeft: '8px' }}>#{m.code}</span>
            </div>
            <button style={btnDanger} onClick={async () => { await fetch(`/api/admin/meters?id=${m.id}`, { method: 'DELETE' }); loadAll(); }}>删除</button>
          </div>
        ))}
        {meters.length === 0 && <div style={{ fontSize: '12px', color: '#4a6485', padding: '8px' }}>暂无表计</div>}
      </div>

      {/* 同比环比 */}
      {stats && stats.mom && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
            <div style={{ fontSize: '11px', color: '#8aa5c4' }}>环比（上月对比）</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: parseFloat(stats.mom.change_pct) > 0 ? '#ff4d6d' : '#00ff88', fontFamily: 'Orbitron' }}>
              {parseFloat(stats.mom.change_pct) > 0 ? '↑' : '↓'} {Math.abs(parseFloat(stats.mom.change_pct))}%
            </div>
            <div style={{ fontSize: '10px', color: '#4a6485' }}>本月 {stats.mom.electricity_kwh.toFixed(0)} kWh | 上月 {stats.mom.prev_kwh.toFixed(0)} kWh</div>
          </div>
          <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(255,170,68,0.08)', border: '1px solid rgba(255,170,68,0.2)' }}>
            <div style={{ fontSize: '11px', color: '#8aa5c4' }}>同比（去年同月）</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: stats.yoy ? (parseFloat(stats.yoy.change_pct) > 0 ? '#ff4d6d' : '#00ff88') : '#4a6485', fontFamily: 'Orbitron' }}>
              {stats.yoy ? `${parseFloat(stats.yoy.change_pct) > 0 ? '↑' : '↓'} ${Math.abs(parseFloat(stats.yoy.change_pct))}%` : '无数据'}
            </div>
            <div style={{ fontSize: '10px', color: '#4a6485' }}>{stats.yoy ? `本年 ${stats.yoy.electricity_kwh.toFixed(0)} kWh | 去年 ${stats.yoy.prev_kwh.toFixed(0)} kWh` : '暂无去年数据'}</div>
          </div>
        </div>
      )}

      {/* 添加月度数据 */}
      <EnergyForm projectId={project.id} onCreated={loadAll} />

      {/* 月度数据列表 */}
      <div style={{ marginTop: '10px', maxHeight: '200px', overflowY: 'auto' }}>
        {energyData.map(e => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', marginBottom: '4px', borderRadius: '4px', background: 'rgba(0,212,255,0.05)' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>{e.year}年{e.month}月</span>
              <span style={{ fontSize: '11px', color: '#00ffcc', marginLeft: '12px' }}>{e.electricity_kwh.toFixed(0)} kWh</span>
              <span style={{ fontSize: '11px', color: '#ffaa44', marginLeft: '12px' }}>¥{e.cost_cny.toFixed(0)}</span>
            </div>
            <button style={btnDanger} onClick={async () => { await fetch(`/api/admin/energy?id=${e.id}`, { method: 'DELETE' }); loadAll(); }}>删除</button>
          </div>
        ))}
        {energyData.length === 0 && <div style={{ fontSize: '12px', color: '#4a6485', padding: '8px' }}>暂无用电数据</div>}
      </div>
    </div>
  );
}

// === 子表单组件 ===
function FloorForm({ projectId, onCreated }: { projectId: number; onCreated: () => void }) {
  const [name, setName] = useState('');
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <input style={inputStyle} placeholder="楼层名(如1F)" value={name} onChange={e => setName(e.target.value)} />
      <button style={btnPrimary} onClick={async () => {
        if (!name) return;
        await fetch('/api/admin/floors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: projectId, name }) });
        setName(''); onCreated();
      }}>+</button>
    </div>
  );
}

function RoomForm({ floorId, projectId, onCreated }: { floorId: number; projectId: number; onCreated: () => void }) {
  const [name, setName] = useState('');
  return (
    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
      <input style={{ ...inputStyle, fontSize: '11px' }} placeholder="房间名" value={name} onChange={e => setName(e.target.value)} />
      <button style={{ ...btnPrimary, padding: '3px 8px', fontSize: '11px' }} onClick={async () => {
        if (!name) return;
        await fetch('/api/admin/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ floor_id: floorId, project_id: projectId, name }) });
        setName(''); onCreated();
      }}>+</button>
    </div>
  );
}

function DeviceForm({ projectId, roomId, stations, onCreated }: { projectId: number; roomId: number; stations: Station[]; onCreated: () => void }) {
  const [deviceType, setDeviceType] = useState('chiller');
  const [subtype, setSubtype] = useState('screw');
  const [stationId, setStationId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' }}>
      <select style={inputStyle} value={deviceType} onChange={e => setDeviceType(e.target.value)}>
        {Object.entries(DEVICE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {deviceType === 'chiller' && (
        <select style={inputStyle} value={subtype} onChange={e => setSubtype(e.target.value)}>
          {Object.entries(CHILLER_SUBTYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      )}
      <select style={inputStyle} value={stationId} onChange={e => setStationId(e.target.value)}>
        <option value="">不关联冷站</option>
        {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <input style={inputStyle} placeholder="名称" value={name} onChange={e => setName(e.target.value)} />
      <input style={inputStyle} placeholder="编号" value={code} onChange={e => setCode(e.target.value)} />
      <button style={{ ...btnPrimary, gridColumn: '1/5' }} onClick={async () => {
        if (!name || !code) return;
        await fetch('/api/admin/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          project_id: projectId, room_id: roomId, station_id: stationId || null,
          device_type: deviceType, chiller_subtype: deviceType === 'chiller' ? subtype : null, name, code,
        }) });
        setName(''); setCode(''); onCreated();
      }}>+ 添加设备</button>
    </div>
  );
}

function MeterForm({ projectId, onCreated }: { projectId: number; onCreated: () => void }) {
  const [level, setLevel] = useState('1');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' }}>
      <select style={inputStyle} value={level} onChange={e => setLevel(e.target.value)}>
        {Object.entries(METER_LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input style={inputStyle} placeholder="表计名称" value={name} onChange={e => setName(e.target.value)} />
      <input style={inputStyle} placeholder="表计编号" value={code} onChange={e => setCode(e.target.value)} />
      <button style={btnPrimary} onClick={async () => {
        if (!name || !code) return;
        await fetch('/api/admin/meters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: projectId, meter_level: parseInt(level), name, code }) });
        setName(''); setCode(''); onCreated();
      }}>+ 添加</button>
    </div>
  );
}

function EnergyForm({ projectId, onCreated }: { projectId: number; onCreated: () => void }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [kwh, setKwh] = useState('');
  const [cost, setCost] = useState('');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '4px', marginTop: '16px' }}>
      <input style={inputStyle} placeholder="年" value={year} onChange={e => setYear(e.target.value)} />
      <input style={inputStyle} placeholder="月" value={month} onChange={e => setMonth(e.target.value)} />
      <input style={inputStyle} placeholder="用电量kWh" value={kwh} onChange={e => setKwh(e.target.value)} />
      <input style={inputStyle} placeholder="电费元" value={cost} onChange={e => setCost(e.target.value)} />
      <button style={btnPrimary} onClick={async () => {
        if (!year || !month) return;
        await fetch('/api/admin/energy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: projectId, year: parseInt(year), month: parseInt(month), electricity_kwh: parseFloat(kwh) || 0, cost_cny: parseFloat(cost) || 0 }) });
        setKwh(''); setCost(''); onCreated();
      }}>+ 添加</button>
    </div>
  );
}

function DeviceCard({ device, onDeleted }: { device: Device; onDeleted: () => void }) {
  const [showParams, setShowParams] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const typeLabel = DEVICE_TYPE_LABELS[device.device_type] || device.device_type;
  const subtypeLabel = device.chiller_subtype ? ` · ${CHILLER_SUBTYPES[device.chiller_subtype] || ''}` : '';
  const statusColor = device.is_offline ? '#4a6485' : device.is_fault ? '#ff4d6d' : device.running_status === 'running' ? '#00ff88' : '#ffaa44';

  return (
    <div style={{ padding: '8px 10px', marginBottom: '4px', borderRadius: '4px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 600 }}>{device.name}</span>
          <span style={{ fontSize: '11px', color: '#8aa5c4', marginLeft: '6px' }}>{typeLabel}{subtypeLabel}</span>
          <span style={{ fontSize: '11px', color: '#4a6485', marginLeft: '6px' }}>#{device.code}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: statusColor, fontWeight: 600 }}>
            {device.is_offline ? '离线' : device.is_fault ? '故障' : STATUS_LABELS[device.running_status] || device.running_status}
          </span>
          <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px', background: 'rgba(0,212,255,0.2)', color: '#00d4ff' }} onClick={async () => {
            if (!showParams) {
              const res = await fetch(`/api/admin/metrics?device_id=${device.id}`);
              const json = await res.json();
              if (json.success) setMetrics(json.data);
            }
            setShowParams(!showParams);
          }}>{showParams ? '收起' : '参数'}</button>
          <button style={btnDanger} onClick={async () => {
            if (!confirm(`删除设备「${device.name}」？`)) return;
            await fetch(`/api/admin/devices?id=${device.id}`, { method: 'DELETE' });
            onDeleted();
          }}>删除</button>
        </div>
      </div>
      {showParams && (
        <div style={{ marginTop: '6px', padding: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
          {metrics ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
              {Object.entries(metrics.params || {}).map(([k, v]: any) => (
                <div key={k} style={{ fontSize: '10px' }}><span style={{ color: '#8aa5c4' }}>{k}: </span><span style={{ color: '#00ffcc' }}>{v}</span></div>
              ))}
            </div>
          ) : <div style={{ fontSize: '10px', color: '#4a6485' }}>暂无时序数据</div>}
        </div>
      )}
    </div>
  );
}
