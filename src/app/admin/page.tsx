'use client';
import { useState, useEffect, useCallback } from 'react';

// === 类型 ===
interface TreeNode { id: string; type: string; dbId: number; label: string; icon: string; meta?: string; data?: any; children?: TreeNode[]; }
interface ModuleCfg { id: number; module_key: string; label: string; icon: string; sort_order: number; is_visible: number; }

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
const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  border: '1px solid ' + (active ? 'var(--primary)' : 'transparent'),
  background: active ? 'rgba(0,212,255,0.15)' : 'transparent',
  color: active ? '#00d4ff' : '#8aa5c4', borderRadius: '4px', transition: 'all 0.2s',
});

const PROVINCE_CITY: Record<string, string[]> = {
  '广东省': ['深圳市', '广州市', '东莞市', '佛山市', '珠海市'],
  '江苏省': ['南京市', '苏州市', '无锡市', '常州市'],
  '浙江省': ['杭州市', '宁波市', '温州市', '嘉兴市'],
  '北京市': ['北京市'],
  '上海市': ['上海市'],
  '山东省': ['济南市', '青岛市', '烟台市'],
  '四川省': ['成都市', '绵阳市'],
  '湖北省': ['武汉市', '宜昌市'],
};

const DEVICE_TYPE_LABELS: Record<string, string> = {
  chiller: '制冷机', frozen_pump: '冷冻泵', cooling_pump: '冷却泵', cooling_tower: '冷却塔', ahu: '风柜',
};
const CHILLER_SUBTYPES: Record<string, string> = { screw: '螺杆式', centrifugal: '离心式', magnetic: '磁悬浮' };
const METER_LEVEL_LABELS: Record<number, string> = { 1: '一级(总表)', 2: '二级(区域表)', 3: '三级(终端表)' };
const DEVICE_PARAM_TEMPLATES: Record<string, { label: string; key: string; unit?: string }[]> = {
  chiller: [
    { label: '冷冻进水温度', key: 'frozen_in_temp', unit: '℃' }, { label: '冷冻出水温度', key: 'frozen_out_temp', unit: '℃' },
    { label: '冷却进水温度', key: 'cooling_in_temp', unit: '℃' }, { label: '冷却出水温度', key: 'cooling_out_temp', unit: '℃' },
    { label: '出水温度设定', key: 'target_temp', unit: '℃' }, { label: '蒸发温度', key: 'evap_temp', unit: '℃' },
    { label: '冷凝温度', key: 'cond_temp', unit: '℃' }, { label: '压缩机油温', key: 'oil_temp', unit: '℃' },
    { label: '蒸发压力', key: 'evap_pressure', unit: 'kPa' }, { label: '冷凝压力', key: 'cond_pressure', unit: 'kPa' },
    { label: '电流', key: 'current', unit: 'A' }, { label: '电压', key: 'voltage', unit: 'V' },
    { label: '功率', key: 'power', unit: 'kW' }, { label: '运行时间', key: 'run_hours', unit: 'h' },
  ],
  frozen_pump: [{ label: '运行频率', key: 'freq', unit: 'Hz' }, { label: '运行功率', key: 'power', unit: 'kW' }, { label: '运行时间', key: 'run_hours', unit: 'H' }, { label: '电流', key: 'current', unit: 'A' }, { label: '电压', key: 'voltage', unit: 'V' }],
  cooling_pump: [{ label: '运行频率', key: 'freq', unit: 'Hz' }, { label: '运行功率', key: 'power', unit: 'kW' }, { label: '运行时间', key: 'run_hours', unit: 'H' }, { label: '电流', key: 'current', unit: 'A' }, { label: '电压', key: 'voltage', unit: 'V' }],
  cooling_tower: [{ label: '运行频率', key: 'freq', unit: 'Hz' }, { label: '运行功率', key: 'power', unit: 'kW' }, { label: '运行时间', key: 'run_hours', unit: 'H' }, { label: '电流', key: 'current', unit: 'A' }, { label: '电压', key: 'voltage', unit: 'V' }],
  ahu: [{ label: '设定温度', key: 'set_temp', unit: '℃' }, { label: '反馈温度', key: 'feedback_temp', unit: '℃' }, { label: '冷水开度', key: 'cold_valve', unit: '%' }, { label: '热水开度', key: 'hot_valve', unit: '%' }],
};

export default function AdminPage() {
  const [tab, setTab] = useState<'modules' | 'devices' | 'energy'>('modules');

  return (
    <div style={{ minHeight: '100vh', background: '#050d1a', color: '#e8f4ff', padding: '20px', fontFamily: 'Rajdhani, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', color: '#00d4ff' }}>🛠 综合能源管理后台</h1>
        <a href="/" style={{ fontSize: '13px', color: '#8aa5c4', textDecoration: 'none' }}>← 返回大屏</a>
      </div>

      {/* Tab 导航 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <button style={tabBtnStyle(tab === 'modules')} onClick={() => setTab('modules')}>📐 模块管理</button>
        <button style={tabBtnStyle(tab === 'devices')} onClick={() => setTab('devices')}>🏢 项目设备管理</button>
        <button style={tabBtnStyle(tab === 'energy')} onClick={() => setTab('energy')}>⚡ 能源管理</button>
      </div>

      {/* Tab 内容 */}
      {tab === 'modules' && <ModulesTab />}
      {tab === 'devices' && <DevicesTab />}
      {tab === 'energy' && <EnergyTab />}
    </div>
  );
}

// ===================== 模块管理 Tab =====================
function ModulesTab() {
  const [modules, setModules] = useState<ModuleCfg[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('📊');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/modules');
    const json = await res.json();
    if (json.success) setModules(json.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleVisible = async (m: ModuleCfg) => {
    await fetch('/api/admin/modules', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, is_visible: m.is_visible ? 0 : 1 }) });
    load();
  };

  const updateSort = async (m: ModuleCfg, delta: number) => {
    await fetch('/api/admin/modules', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, sort_order: m.sort_order + delta }) });
    load();
  };

  const addModule = async () => {
    if (!newKey || !newLabel) return;
    await fetch('/api/admin/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ module_key: newKey, label: newLabel, icon: newIcon, sort_order: modules.length + 1 }) });
    setNewKey(''); setNewLabel(''); setNewIcon('📊');
    load();
  };

  const delModule = async (m: ModuleCfg) => {
    if (!confirm(`删除模块「${m.label}」？`)) return;
    await fetch(`/api/admin/modules?id=${m.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: '15px', marginBottom: '10px', color: '#00d4ff' }}>📐 大屏模块配置</h2>
      <p style={{ fontSize: '12px', color: '#8aa5c4', marginBottom: '12px' }}>勾选「显示」控制模块在大屏上是否可见，调整排序改变大屏导航栏顺序。</p>

      {/* 添加新模块 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 60px 80px', gap: '6px', marginBottom: '12px' }}>
        <input style={inputStyle} placeholder="模块标识(如 solar)" value={newKey} onChange={e => setNewKey(e.target.value)} />
        <input style={inputStyle} placeholder="模块名称(如 光伏发电)" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
        <input style={inputStyle} placeholder="图标" value={newIcon} onChange={e => setNewIcon(e.target.value)} />
        <button style={btnPrimary} onClick={addModule}>+ 添加</button>
      </div>

      {/* 模块列表 */}
      <div>
        {modules.map((m, i) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', marginBottom: '4px', borderRadius: '4px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}>
            <span style={{ fontSize: '16px' }}>{m.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '100px' }}>{m.label}</span>
            <span style={{ fontSize: '11px', color: '#4a6485' }}>key: {m.module_key}</span>
            <span style={{ fontSize: '11px', color: '#4a6485' }}>排序: {m.sort_order}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button style={{ ...btnPrimary, padding: '2px 6px', fontSize: '11px', background: 'rgba(0,212,255,0.2)', color: '#00d4ff' }} onClick={() => updateSort(m, -1)} disabled={i === 0}>↑</button>
              <button style={{ ...btnPrimary, padding: '2px 6px', fontSize: '11px', background: 'rgba(0,212,255,0.2)', color: '#00d4ff' }} onClick={() => updateSort(m, 1)} disabled={i === modules.length - 1}>↓</button>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#8aa5c4', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!m.is_visible} onChange={() => toggleVisible(m)} style={{ cursor: 'pointer' }} />
                {m.is_visible ? '显示' : '隐藏'}
              </label>
              <button style={btnDanger} onClick={() => delModule(m)}>删除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== 项目设备管理 Tab =====================
function DevicesTab() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTree = useCallback(async () => {
    const res = await fetch('/api/admin/tree');
    const json = await res.json();
    if (json.success) setTree(json.data);
  }, []);
  useEffect(() => { loadTree(); }, [loadTree, refreshKey]);
  const refresh = () => setRefreshKey(k => k + 1);
  const toggle = (id: string) => setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px', alignItems: 'start' }}>
      <div style={{ ...cardStyle, maxHeight: '70vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '15px', marginBottom: '10px', color: '#00d4ff' }}>🌲 项目树</h2>
        <AddProjectInline onCreated={refresh} />
        <div style={{ marginTop: '8px' }}>
          {tree.map(node => <TreeRow key={node.id} node={node} depth={0} selected={selected} onSelect={setSelected} expanded={expanded} onToggle={toggle} onRefresh={refresh} />)}
          {tree.length === 0 && <div style={{ fontSize: '12px', color: '#4a6485', padding: '8px' }}>暂无项目</div>}
        </div>
      </div>
      <div style={cardStyle}>
        {selected ? <NodeDetail node={selected} onRefresh={refresh} /> : <div style={{ fontSize: '13px', color: '#4a6485', padding: '40px 0', textAlign: 'center' }}>← 点击左侧树节点查看详情</div>}
      </div>
    </div>
  );
}

// ===================== 能源管理 Tab =====================
function EnergyTab() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selProject, setSelProject] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [energyData, setEnergyData] = useState<any[]>([]);
  const [meters, setMeters] = useState<any[]>([]);
  const [meterStats, setMeterStats] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const [newKwh, setNewKwh] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newMonth, setNewMonth] = useState(String(new Date().getMonth() + 1));
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));

  const loadProjects = useCallback(async () => {
    const res = await fetch('/api/admin/projects');
    const json = await res.json();
    if (json.success) setProjects(json.data);
  }, []);
  useEffect(() => { loadProjects(); }, [loadProjects]);

  const loadEnergy = useCallback(async () => {
    if (!selProject) return;
    const [s, e, m] = await Promise.all([
      fetch(`/api/admin/energy?project_id=${selProject.id}&stats=1`).then(r => r.json()),
      fetch(`/api/admin/energy?project_id=${selProject.id}`).then(r => r.json()),
      fetch(`/api/admin/meters?project_id=${selProject.id}`).then(r => r.json()),
    ]);
    if (s.success) setStats(s.data);
    if (e.success) setEnergyData(e.data);
    if (m.success) { setMeters(m.data); setMeterStats(m.stats); }
  }, [selProject]);
  useEffect(() => { loadEnergy(); }, [loadEnergy]);

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: '15px', marginBottom: '10px', color: '#00d4ff' }}>⚡ 能源管理</h2>
      {/* 选择项目 */}
      <select style={{ ...inputStyle, width: '300px', marginBottom: '12px' }} value={selProject?.id || ''} onChange={e => {
        const p = projects.find(p => p.id === parseInt(e.target.value));
        setSelProject(p || null);
      }}>
        <option value="">— 选择项目 —</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.province} › {p.city} › {p.name}</option>)}
      </select>

      {selProject ? (
        <>
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

          {/* 同比环比 */}
          {stats?.mom && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
                <div style={{ fontSize: '11px', color: '#8aa5c4' }}>环比（上月）</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: parseFloat(stats.mom.change_pct) > 0 ? '#ff4d6d' : '#00ff88', fontFamily: 'Orbitron' }}>
                  {parseFloat(stats.mom.change_pct) > 0 ? '↑' : '↓'} {Math.abs(parseFloat(stats.mom.change_pct))}%
                </div>
                <div style={{ fontSize: '10px', color: '#4a6485' }}>本月 {stats.mom.electricity_kwh?.toFixed(0)} kWh | 上月 {stats.mom.prev_kwh?.toFixed(0)} kWh</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(255,170,68,0.08)', border: '1px solid rgba(255,170,68,0.2)' }}>
                <div style={{ fontSize: '11px', color: '#8aa5c4' }}>同比（去年同月）</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: stats.yoy ? (parseFloat(stats.yoy.change_pct) > 0 ? '#ff4d6d' : '#00ff88') : '#4a6485', fontFamily: 'Orbitron' }}>
                  {stats.yoy ? `${parseFloat(stats.yoy.change_pct) > 0 ? '↑' : '↓'} ${Math.abs(parseFloat(stats.yoy.change_pct))}%` : '无数据'}
                </div>
                <div style={{ fontSize: '10px', color: '#4a6485' }}>{stats.yoy ? `本年 ${stats.yoy.electricity_kwh?.toFixed(0)} kWh | 去年 ${stats.yoy.prev_kwh?.toFixed(0)} kWh` : ''}</div>
              </div>
            </div>
          )}

          {/* 录入用电量 */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 60px 1fr 1fr 80px', gap: '6px', marginBottom: '12px' }}>
            <input style={inputStyle} placeholder="年" value={newYear} onChange={e => setNewYear(e.target.value)} />
            <input style={inputStyle} placeholder="月" value={newMonth} onChange={e => setNewMonth(e.target.value)} />
            <input style={inputStyle} placeholder="用电量kWh" value={newKwh} onChange={e => setNewKwh(e.target.value)} />
            <input style={inputStyle} placeholder="电费元" value={newCost} onChange={e => setNewCost(e.target.value)} />
            <button style={btnPrimary} onClick={async () => {
              await fetch('/api/admin/energy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: selProject.id, year: parseInt(newYear), month: parseInt(newMonth), electricity_kwh: parseFloat(newKwh) || 0, cost_cny: parseFloat(newCost) || 0 }) });
              setNewKwh(''); setNewCost(''); loadEnergy();
            }}>+</button>
          </div>

          {/* 月度数据列表 */}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {energyData.map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', marginBottom: '4px', borderRadius: '4px', background: 'rgba(0,212,255,0.05)' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{e.year}年{e.month}月</span>
                  <span style={{ fontSize: '11px', color: '#00ffcc', marginLeft: '12px' }}>{e.electricity_kwh.toFixed(0)} kWh</span>
                  <span style={{ fontSize: '11px', color: '#ffaa44', marginLeft: '12px' }}>¥{e.cost_cny.toFixed(0)}</span>
                </div>
                <button style={btnDanger} onClick={async () => { await fetch(`/api/admin/energy?id=${e.id}`, { method: 'DELETE' }); loadEnergy(); }}>删除</button>
              </div>
            ))}
            {energyData.length === 0 && <div style={{ fontSize: '12px', color: '#4a6485', padding: '8px' }}>暂无用电数据</div>}
          </div>
        </>
      ) : (
        <div style={{ fontSize: '13px', color: '#4a6485', padding: '20px 0', textAlign: 'center' }}>请选择项目查看能源数据</div>
      )}
    </div>
  );
}

// ===================== 树形组件（设备管理用） =====================
function TreeRow({ node, depth, selected, onSelect, expanded, onToggle, onRefresh }: {
  node: TreeNode; depth: number; selected: TreeNode | null;
  onSelect: (n: TreeNode) => void; expanded: Set<string>; onToggle: (id: string) => void; onRefresh: () => void;
}) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selected?.id === node.id;
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', background: isSelected ? 'rgba(0,212,255,0.15)' : 'transparent', border: '1px solid ' + (isSelected ? 'rgba(0,212,255,0.4)' : 'transparent'), marginLeft: `${depth * 16}px`, fontSize: '12px', gap: '4px' }} onClick={() => { onSelect(node); if (hasChildren) onToggle(node.id); }}>
        <span style={{ fontSize: '10px', color: '#4a6485', width: '12px' }}>{hasChildren ? (isExpanded ? '▼' : '▶') : ''}</span>
        <span>{node.icon}</span>
        <span style={{ fontWeight: isSelected ? 600 : 400 }}>{node.label}</span>
        {node.meta && <span style={{ fontSize: '10px', color: '#4a6485' }}>{node.meta}</span>}
      </div>
      {isExpanded && hasChildren && node.children!.map(child => <TreeRow key={child.id} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} expanded={expanded} onToggle={onToggle} onRefresh={onRefresh} />)}
    </div>
  );
}

function AddButton({ node, onCreated }: { node: TreeNode; onCreated: () => void }) {
  if (node.type === 'city' || node.type === 'province') {
    return <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => {
      const name = prompt('输入项目名：');
      if (name) { const province = node.type === 'province' ? node.label : ''; await fetch('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ province, city: node.label, name }) }); onCreated(); }
    }}>+ 项目</button>;
  }
  if (node.type === 'project') {
    return <div style={{ display: 'flex', gap: '4px' }}>
      <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => { const n = prompt('冷站名：'); if (n) { await fetch('/api/admin/stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.dbId, name: n }) }); onCreated(); } }}>+ 冷站</button>
      <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => { const n = prompt('楼层名(如1F)：'); if (n) { await fetch('/api/admin/floors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.dbId, name: n }) }); onCreated(); } }}>+ 楼层</button>
      <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => { const n = prompt('表计名：'); if (n) { const l = prompt('级别(1/2/3)：', '1'); await fetch('/api/admin/meters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.dbId, meter_level: parseInt(l || '1'), name: n, code: n }) }); onCreated(); } }}>+ 表计</button>
    </div>;
  }
  if (node.type === 'floor') {
    return <div style={{ display: 'flex', gap: '4px' }}>
      <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => { const n = prompt('房间名：'); if (n) { await fetch('/api/admin/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ floor_id: node.dbId, project_id: node.data?.project_id, name: n }) }); onCreated(); } }}>+ 房间</button>
      <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => { const n = prompt('设备名：'); if (n) { const c = prompt('编号：', n); const t = prompt('类型(chiller/frozen_pump/cooling_pump/cooling_tower/ahu)：', 'chiller'); await fetch('/api/admin/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.data?.project_id, floor_id: node.dbId, device_type: t || 'chiller', name: n, code: c || n }) }); onCreated(); } }}>+ 设备</button>
    </div>;
  }
  if (node.type === 'room') {
    return <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => { const n = prompt('设备名：'); if (n) { const c = prompt('编号：', n); const t = prompt('类型：', 'chiller'); await fetch('/api/admin/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.data?.project_id, room_id: node.dbId, device_type: t || 'chiller', name: n, code: c || n }) }); onCreated(); } }}>+ 设备</button>;
  }
  if (node.type === 'station') {
    return <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => { const n = prompt('设备名：'); if (n) { const c = prompt('编号：', n); const t = prompt('类型：', 'chiller'); await fetch('/api/admin/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.data?.project_id, station_id: node.dbId, device_type: t || 'chiller', name: n, code: c || n }) }); onCreated(); } }}>+ 设备</button>;
  }
  return null;
}

function AddProjectInline({ onCreated }: { onCreated: () => void }) {
  const [province, setProvince] = useState('广东省');
  const [city, setCity] = useState('深圳市');
  const [name, setName] = useState('');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' }}>
      <select style={inputStyle} value={province} onChange={e => { setProvince(e.target.value); setCity(PROVINCE_CITY[e.target.value]?.[0] || ''); }}>{Object.keys(PROVINCE_CITY).map(p => <option key={p} value={p}>{p}</option>)}</select>
      <select style={inputStyle} value={city} onChange={e => setCity(e.target.value)}>{(PROVINCE_CITY[province] || []).map(c => <option key={c} value={c}>{c}</option>)}</select>
      <input style={inputStyle} placeholder="项目名" value={name} onChange={e => setName(e.target.value)} />
      <button style={btnPrimary} onClick={async () => { if (!name) return; await fetch('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ province, city, name }) }); setName(''); onCreated(); }}>+</button>
    </div>
  );
}

// 节点类型标签
const TYPE_LABELS: Record<string, string> = {
  province: '省份', city: '城市', project: '项目', floor: '楼层', room: '房间',
  station: '冷站', device: '设备', meter: '表计',
};
const TYPE_COLORS: Record<string, string> = {
  province: '#00d4ff', city: '#00ffcc', project: '#ffaa44', floor: '#00ff88',
  room: '#ff4d6d', station: '#0088ff', device: '#ffcc00', meter: '#ff8800',
};

function NodeDetail({ node, onRefresh }: { node: TreeNode; onRefresh: () => void }) {
  const typeLabel = TYPE_LABELS[node.type] || node.type;
  const typeColor = TYPE_COLORS[node.type] || '#8aa5c4';

  return (
    <div>
      {/* 顶部：图标 + 名称 + 类型标签 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px' }}>{node.icon}</span>
        <h2 style={{ fontSize: '16px', color: '#e8f4ff' }}>{node.label}</h2>
        <span style={{
          padding: '2px 10px', fontSize: '11px', fontWeight: 600,
          background: `${typeColor}20`, color: typeColor,
          border: `1px solid ${typeColor}40`, borderRadius: '12px',
        }}>{typeLabel}</span>
      </div>

      {/* 右侧添加按钮 */}
      <AddButtonBar node={node} onCreated={onRefresh} />

      {/* 具体内容 */}
      <div style={{ marginTop: '16px' }}>
        {node.type === 'device' && <DeviceDetail node={node} onRefresh={onRefresh} />}
        {node.type === 'meter' && <MeterDetail node={node} onRefresh={onRefresh} />}
        {node.type === 'project' && <ProjectDetail node={node} onRefresh={onRefresh} />}
        {['province', 'city', 'floor', 'room', 'station'].includes(node.type) && (
          <div style={{ fontSize: '13px', color: '#8aa5c4' }}>
            <p>子节点数量：{node.children?.length || 0}</p>
            {node.children && node.children.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '12px', color: '#4a6485', marginBottom: '4px' }}>子节点：</div>
                {node.children.map(c => (
                  <span key={c.id} style={{ display: 'inline-block', margin: '2px 4px', padding: '2px 8px', fontSize: '11px', background: 'rgba(0,212,255,0.1)', borderRadius: '4px', color: '#8aa5c4' }}>
                    {c.icon} {c.label} <span style={{ color: TYPE_COLORS[c.type] || '#4a6485' }}>({TYPE_LABELS[c.type] || c.type})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 添加按钮栏（显示在右侧详情区）
function AddButtonBar({ node, onCreated }: { node: TreeNode; onCreated: () => void }) {
  const btn: React.CSSProperties = { ...btnPrimary, padding: '4px 10px', fontSize: '11px' };
  const wrap: React.CSSProperties = { display: 'flex', gap: '6px', flexWrap: 'wrap' };

  if (node.type === 'province' || node.type === 'city') {
    return <div style={wrap}><button style={btn} onClick={async () => {
      const name = prompt('输入项目名：');
      if (name) { const province = node.type === 'province' ? '' : ''; await fetch('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ province: node.type === 'province' ? node.label : '', city: node.label, name }) }); onCreated(); }
    }}>+ 添加项目</button></div>;
  }
  if (node.type === 'project') {
    return <div style={wrap}>
      <button style={btn} onClick={async () => { const n = prompt('冷站名：'); if (n) { await fetch('/api/admin/stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.dbId, name: n }) }); onCreated(); } }}>+ 冷站</button>
      <button style={btn} onClick={async () => { const n = prompt('楼层名(如1F)：'); if (n) { await fetch('/api/admin/floors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.dbId, name: n }) }); onCreated(); } }}>+ 楼层</button>
      <button style={btn} onClick={async () => { const n = prompt('表计名：'); if (n) { const l = prompt('级别(1/2/3)：', '1'); await fetch('/api/admin/meters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.dbId, meter_level: parseInt(l || '1'), name: n, code: n }) }); onCreated(); } }}>+ 表计</button>
    </div>;
  }
  if (node.type === 'floor') {
    return <div style={wrap}>
      <button style={btn} onClick={async () => { const n = prompt('房间名：'); if (n) { await fetch('/api/admin/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ floor_id: node.dbId, project_id: node.data?.project_id, name: n }) }); onCreated(); } }}>+ 房间</button>
      <button style={btn} onClick={async () => { const n = prompt('设备名：'); if (n) { const c = prompt('编号：', n); const t = prompt('类型(chiller/frozen_pump/cooling_pump/cooling_tower/ahu)：', 'chiller'); await fetch('/api/admin/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.data?.project_id, floor_id: node.dbId, device_type: t || 'chiller', name: n, code: c || n }) }); onCreated(); } }}>+ 设备</button>
    </div>;
  }
  if (node.type === 'room') {
    return <div style={wrap}><button style={btn} onClick={async () => { const n = prompt('设备名：'); if (n) { const c = prompt('编号：', n); const t = prompt('类型：', 'chiller'); await fetch('/api/admin/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.data?.project_id, room_id: node.dbId, device_type: t || 'chiller', name: n, code: c || n }) }); onCreated(); } }}>+ 设备</button></div>;
  }
  if (node.type === 'station') {
    return <div style={wrap}><button style={btn} onClick={async () => { const n = prompt('设备名：'); if (n) { const c = prompt('编号：', n); const t = prompt('类型：', 'chiller'); await fetch('/api/admin/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.data?.project_id, station_id: node.dbId, device_type: t || 'chiller', name: n, code: c || n }) }); onCreated(); } }}>+ 设备</button></div>;
  }
  return null;
}

function DeviceDetail({ node, onRefresh }: { node: TreeNode; onRefresh: () => void }) {
  const d = node.data;
  const [tab, setTab] = useState<'latest' | 'input' | 'history'>('latest');
  const [metrics, setMetrics] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const template = DEVICE_PARAM_TEMPLATES[d?.device_type] || [];

  const loadLatest = async () => { const res = await fetch(`/api/admin/metrics?device_id=${d.id}`); const j = await res.json(); if (j.success) setMetrics(j.data); };
  const loadHistory = async () => { const res = await fetch(`/api/admin/metrics?device_id=${d.id}&history=1&limit=20`); const j = await res.json(); if (j.success) setHistory(j.data || []); };
  useEffect(() => { loadLatest(); }, [d?.id]);

  const submitParams = async () => {
    const params: Record<string, string> = {};
    template.forEach(p => { const v = paramValues[p.key]; if (v) params[`${p.label}(${p.unit || ''})`] = v; });
    if (Object.keys(params).length === 0) return;
    await fetch('/api/admin/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_id: d.id, params }) });
    setParamValues({}); setTab('latest'); loadLatest();
  };

  const typeLabel = DEVICE_TYPE_LABELS[d?.device_type] || d?.device_type;
  const statusColor = d?.is_offline ? '#4a6485' : d?.is_fault ? '#ff4d6d' : d?.running_status === 'running' ? '#00ff88' : '#ffaa44';

  return (
    <div>
      <div style={{ fontSize: '12px', color: '#8aa5c4', marginBottom: '10px' }}>编号：#{d?.code} | 类型：{typeLabel} | <span style={{ color: statusColor, fontWeight: 600 }}>{d?.is_offline ? '离线' : d?.is_fault ? '故障' : d?.running_status}</span></div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
        {[{ k: 'latest', l: '📊最新' }, { k: 'input', l: '📝录入' }, { k: 'history', l: '📜历史' }].map(t => (
          <button key={t.k} onClick={() => { setTab(t.k as any); if (t.k === 'latest') loadLatest(); if (t.k === 'history') loadHistory(); }} style={{ ...btnPrimary, padding: '4px 10px', fontSize: '11px', background: tab === t.k ? '#00d4ff' : 'rgba(0,212,255,0.15)', color: tab === t.k ? '#02070f' : '#00d4ff' }}>{t.l}</button>
        ))}
        <button style={{ ...btnDanger, padding: '4px 10px', fontSize: '11px', marginLeft: 'auto' }} onClick={async () => { if (confirm('删除此设备？')) { await fetch(`/api/admin/devices?id=${d.id}`, { method: 'DELETE' }); onRefresh(); } }}>删除</button>
      </div>
      {tab === 'latest' && (metrics ? <div><div style={{ fontSize: '10px', color: '#4a6485', marginBottom: '6px' }}>⏱ {metrics.timestamp}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>{Object.entries(metrics.params || {}).map(([k, v]: any) => <div key={k} style={{ padding: '6px', background: 'rgba(0,212,255,0.08)', borderRadius: '4px' }}><div style={{ fontSize: '10px', color: '#8aa5c4' }}>{k}</div><div style={{ fontSize: '14px', color: '#00ffcc', fontWeight: 600 }}>{v}</div></div>)}</div></div> : <div style={{ fontSize: '12px', color: '#4a6485', padding: '20px' }}>暂无数据，点击「录入」</div>)}
      {tab === 'input' && <div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>{template.map(p => <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '10px', color: '#8aa5c4', whiteSpace: 'nowrap' }}>{p.label}</span><input style={{ ...inputStyle, fontSize: '10px', padding: '3px 6px', width: '60px' }} placeholder={p.unit} value={paramValues[p.key] || ''} onChange={e => setParamValues(prev => ({ ...prev, [p.key]: e.target.value }))} /></div>)}</div><button style={{ ...btnPrimary, marginTop: '10px' }} onClick={submitParams}>提交</button></div>}
      {tab === 'history' && <div style={{ maxHeight: '400px', overflowY: 'auto' }}>{history.length > 0 ? history.map((h, i) => <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,212,255,0.1)' }}><div style={{ fontSize: '10px', color: '#4a6485' }}>{h.timestamp}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{Object.entries(h.params || {}).map(([k, v]: any) => <span key={k} style={{ fontSize: '10px', color: '#8aa5c4' }}>{k}: <span style={{ color: '#00ffcc' }}>{v}</span></span>)}</div></div>) : <div style={{ fontSize: '12px', color: '#4a6485', padding: '20px' }}>暂无历史</div>}</div>}
    </div>
  );
}

function MeterDetail({ node, onRefresh }: { node: TreeNode; onRefresh: () => void }) {
  const m = node.data;
  return <div><div style={{ fontSize: '12px', color: '#8aa5c4', marginBottom: '8px' }}>{METER_LEVEL_LABELS[m?.meter_level]} | 编号: #{m?.code} | 位置: {m?.location || '未设置'}</div><button style={{ ...btnDanger, padding: '4px 10px', fontSize: '11px' }} onClick={async () => { if (confirm('删除？')) { await fetch(`/api/admin/meters?id=${m.id}`, { method: 'DELETE' }); onRefresh(); } }}>删除</button></div>;
}

function ProjectDetail({ node, onRefresh }: { node: TreeNode; onRefresh: () => void }) {
  const p = node.data;
  const deviceCount = node.children?.filter(c => c.type === 'device').length || 0;
  const floorCount = node.children?.filter(c => c.type === 'floor').length || 0;
  const stationCount = node.children?.filter(c => c.type === 'station').length || 0;
  const meterCount = node.children?.filter(c => c.type === 'meter').length || 0;
  return <div><div style={{ fontSize: '12px', color: '#8aa5c4', marginBottom: '12px' }}>{p?.province} › {p?.city}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>{[{ l: '冷站', c: stationCount }, { l: '楼层', c: floorCount }, { l: '表计', c: meterCount }, { l: '设备', c: deviceCount }].map(s => <div key={s.l} style={{ padding: '10px', borderRadius: '6px', background: 'rgba(0,212,255,0.08)', textAlign: 'center' }}><div style={{ fontSize: '20px', fontWeight: 700, color: '#00d4ff', fontFamily: 'Orbitron' }}>{s.c}</div><div style={{ fontSize: '10px', color: '#8aa5c4' }}>{s.l}</div></div>)}</div><button style={{ ...btnDanger, padding: '4px 10px', fontSize: '11px' }} onClick={async () => { if (confirm('删除项目及所有子数据？')) { await fetch(`/api/admin/projects?id=${p.id}`, { method: 'DELETE' }); onRefresh(); } }}>删除项目</button></div>;
}
