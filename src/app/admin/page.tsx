'use client';
import { useState, useEffect, useCallback } from 'react';

// === 类型 ===
interface TreeNode {
  id: string; type: string; dbId: number; label: string; icon: string;
  meta?: string; data?: any; children?: TreeNode[];
}

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
    { label: '冷冻进水温度', key: 'frozen_in_temp', unit: '℃' },
    { label: '冷冻出水温度', key: 'frozen_out_temp', unit: '℃' },
    { label: '冷却进水温度', key: 'cooling_in_temp', unit: '℃' },
    { label: '冷却出水温度', key: 'cooling_out_temp', unit: '℃' },
    { label: '出水温度设定', key: 'target_temp', unit: '℃' },
    { label: '蒸发温度', key: 'evap_temp', unit: '℃' },
    { label: '冷凝温度', key: 'cond_temp', unit: '℃' },
    { label: '压缩机油温', key: 'oil_temp', unit: '℃' },
    { label: '蒸发压力', key: 'evap_pressure', unit: 'kPa' },
    { label: '冷凝压力', key: 'cond_pressure', unit: 'kPa' },
    { label: '电流', key: 'current', unit: 'A' },
    { label: '电压', key: 'voltage', unit: 'V' },
    { label: '功率', key: 'power', unit: 'kW' },
    { label: '运行时间', key: 'run_hours', unit: 'h' },
  ],
  frozen_pump: [
    { label: '运行频率', key: 'freq', unit: 'Hz' },
    { label: '运行功率', key: 'power', unit: 'kW' },
    { label: '运行时间', key: 'run_hours', unit: 'H' },
    { label: '电流', key: 'current', unit: 'A' },
    { label: '电压', key: 'voltage', unit: 'V' },
  ],
  cooling_pump: [
    { label: '运行频率', key: 'freq', unit: 'Hz' },
    { label: '运行功率', key: 'power', unit: 'kW' },
    { label: '运行时间', key: 'run_hours', unit: 'H' },
    { label: '电流', key: 'current', unit: 'A' },
    { label: '电压', key: 'voltage', unit: 'V' },
  ],
  cooling_tower: [
    { label: '运行频率', key: 'freq', unit: 'Hz' },
    { label: '运行功率', key: 'power', unit: 'kW' },
    { label: '运行时间', key: 'run_hours', unit: 'H' },
    { label: '电流', key: 'current', unit: 'A' },
    { label: '电压', key: 'voltage', unit: 'V' },
  ],
  ahu: [
    { label: '设定温度', key: 'set_temp', unit: '℃' },
    { label: '反馈温度', key: 'feedback_temp', unit: '℃' },
    { label: '冷水开度', key: 'cold_valve', unit: '%' },
    { label: '热水开度', key: 'hot_valve', unit: '%' },
  ],
};

export default function AdminPage() {
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

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050d1a', color: '#e8f4ff', padding: '20px', fontFamily: 'Rajdhani, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', color: '#00d4ff' }}>🛠 空调节能后台管理</h1>
        <a href="/" style={{ fontSize: '13px', color: '#8aa5c4', textDecoration: 'none' }}>← 返回驾驶舱</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px', alignItems: 'start' }}>
        {/* 左栏：树形导航 */}
        <div style={{ ...cardStyle, maxHeight: '80vh', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '15px', marginBottom: '10px', color: '#00d4ff' }}>🌲 项目树</h2>
          {/* 顶层添加项目按钮 */}
          <AddProjectInline onCreated={refresh} />
          {/* 递归渲染树 */}
          <div style={{ marginTop: '8px' }}>
            {tree.map(node => (
              <TreeRow key={node.id} node={node} depth={0} selected={selected} onSelect={setSelected}
                expanded={expanded} onToggle={toggle} onRefresh={refresh} />
            ))}
            {tree.length === 0 && <div style={{ fontSize: '12px', color: '#4a6485', padding: '8px' }}>暂无项目，点击上方添加</div>}
          </div>
        </div>

        {/* 右栏：节点详情 */}
        <div style={cardStyle}>
          {selected ? (
            <NodeDetail node={selected} onRefresh={refresh} />
          ) : (
            <div style={{ fontSize: '13px', color: '#4a6485', padding: '40px 0', textAlign: 'center' }}>
              ← 点击左侧树节点查看详情<br />或点击「+ 添加项目」开始
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === 树节点行 ===
function TreeRow({ node, depth, selected, onSelect, expanded, onToggle, onRefresh }: {
  node: TreeNode; depth: number; selected: TreeNode | null;
  onSelect: (n: TreeNode) => void; expanded: Set<string>; onToggle: (id: string) => void; onRefresh: () => void;
}) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selected?.id === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const canAdd = ['province', 'city', 'project', 'floor', 'room', 'station'].includes(node.type);

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer',
        background: isSelected ? 'rgba(0,212,255,0.15)' : 'transparent',
        border: '1px solid ' + (isSelected ? 'rgba(0,212,255,0.4)' : 'transparent'),
        marginLeft: `${depth * 16}px`, fontSize: '12px', gap: '4px',
      }} onClick={() => { onSelect(node); if (hasChildren) onToggle(node.id); }}>
        <span style={{ fontSize: '10px', color: '#4a6485', width: '12px' }}>
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </span>
        <span>{node.icon}</span>
        <span style={{ fontWeight: isSelected ? 600 : 400 }}>{node.label}</span>
        {node.meta && <span style={{ fontSize: '10px', color: '#4a6485' }}>{node.meta}</span>}
      </div>
      {/* 添加按钮 */}
      {isSelected && canAdd && (
        <div style={{ marginLeft: `${depth * 16 + 28}px`, marginTop: '2px', marginBottom: '2px' }}>
          <AddButton node={node} onCreated={onRefresh} />
        </div>
      )}
      {/* 子节点 */}
      {isExpanded && hasChildren && node.children!.map(child => (
        <TreeRow key={child.id} node={child} depth={depth + 1} selected={selected}
          onSelect={onSelect} expanded={expanded} onToggle={onToggle} onRefresh={onRefresh} />
      ))}
    </div>
  );
}

// === 动态添加按钮 ===
function AddButton({ node, onCreated }: { node: TreeNode; onCreated: () => void }) {
  if (node.type === 'province') {
    return <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => {
      const city = prompt('输入城市名：');
      if (city) { /* 城市不需要单独存，项目带 city */ onCreated(); }
    }}>+ 添加项目</button>;
  }
  if (node.type === 'city') {
    return <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => {
      const name = prompt('输入项目名：');
      if (name) {
        const province = node.id.replace('city:', '');
        await fetch('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ province: province, city: node.label, name }) });
        onCreated();
      }
    }}>+ 添加项目</button>;
  }
  if (node.type === 'project') {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => {
          const name = prompt('输入冷站名：');
          if (name) {
            await fetch('/api/admin/stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.dbId, name }) });
            onCreated();
          }
        }}>+ 冷站</button>
        <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => {
          const name = prompt('输入楼层名（如 1F）：');
          if (name) {
            await fetch('/api/admin/floors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.dbId, name }) });
            onCreated();
          }
        }}>+ 楼层</button>
        <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => {
          const name = prompt('输入表计名：');
          if (name) {
            const level = prompt('计量级别（1/2/3）：', '1');
            await fetch('/api/admin/meters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: node.dbId, meter_level: parseInt(level || '1'), name, code: name }) });
            onCreated();
          }
        }}>+ 表计</button>
      </div>
    );
  }
  if (node.type === 'floor') {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => {
          const name = prompt('输入房间名：');
          if (name) {
            const projectId = node.data?.project_id || parseInt(node.id.split(':')[1]);
            await fetch('/api/admin/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ floor_id: node.dbId, project_id: projectId, name }) });
            onCreated();
          }
        }}>+ 房间</button>
        <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => {
          const name = prompt('输入设备名：');
          if (name) {
            const projectId = node.data?.project_id || parseInt(node.id.split(':')[1]);
            const code = prompt('设备编号：', name);
            const type = prompt('设备类型（chiller/frozen_pump/cooling_pump/cooling_tower/ahu）：', 'chiller');
            await fetch('/api/admin/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: projectId, floor_id: node.dbId, device_type: type || 'chiller', name, code: code || name }) });
            onCreated();
          }
        }}>+ 设备</button>
      </div>
    );
  }
  if (node.type === 'room') {
    return <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => {
      const name = prompt('输入设备名：');
      if (name) {
        const projectId = node.data?.project_id || parseInt(node.id.split(':')[1]);
        const code = prompt('设备编号：', name);
        const type = prompt('设备类型（chiller/frozen_pump/cooling_pump/cooling_tower/ahu）：', 'chiller');
        await fetch('/api/admin/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: projectId, room_id: node.dbId, device_type: type || 'chiller', name, code: code || name }) });
        onCreated();
      }
    }}>+ 设备</button>;
  }
  if (node.type === 'station') {
    return <button style={{ ...btnPrimary, padding: '2px 8px', fontSize: '11px' }} onClick={async () => {
      const name = prompt('输入设备名：');
      if (name) {
        const projectId = node.data?.project_id;
        const code = prompt('设备编号：', name);
        const type = prompt('设备类型（chiller/frozen_pump/cooling_pump/cooling_tower/ahu）：', 'chiller');
        await fetch('/api/admin/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: projectId, station_id: node.dbId, device_type: type || 'chiller', name, code: code || name }) });
        onCreated();
      }
    }}>+ 设备</button>;
  }
  return null;
}

// === 顶层添加项目 ===
function AddProjectInline({ onCreated }: { onCreated: () => void }) {
  const [province, setProvince] = useState('广东省');
  const [city, setCity] = useState('深圳市');
  const [name, setName] = useState('');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' }}>
      <select style={inputStyle} value={province} onChange={e => { setProvince(e.target.value); setCity(PROVINCE_CITY[e.target.value]?.[0] || ''); }}>
        {Object.keys(PROVINCE_CITY).map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <select style={inputStyle} value={city} onChange={e => setCity(e.target.value)}>
        {(PROVINCE_CITY[province] || []).map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input style={inputStyle} placeholder="项目名" value={name} onChange={e => setName(e.target.value)} />
      <button style={btnPrimary} onClick={async () => {
        if (!name) return;
        await fetch('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ province, city, name }) });
        setName(''); onCreated();
      }}>+</button>
    </div>
  );
}

// === 节点详情面板 ===
function NodeDetail({ node, onRefresh }: { node: TreeNode; onRefresh: () => void }) {
  if (node.type === 'device') return <DeviceDetail node={node} onRefresh={onRefresh} />;
  if (node.type === 'meter') return <MeterDetail node={node} onRefresh={onRefresh} />;
  if (node.type === 'project') return <ProjectDetail node={node} onRefresh={onRefresh} />;

  // 通用详情
  const childCount = node.children?.length || 0;
  return (
    <div>
      <h2 style={{ fontSize: '16px', color: '#00d4ff', marginBottom: '12px' }}>{node.icon} {node.label}</h2>
      <div style={{ fontSize: '13px', color: '#8aa5c4' }}>
        <p>类型：{node.type}</p>
        <p>子节点数量：{childCount}</p>
        {node.data && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '12px', color: '#4a6485', marginBottom: '4px' }}>原始数据：</div>
            <pre style={{ fontSize: '11px', color: '#00ffcc', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(node.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// === 设备详情 ===
function DeviceDetail({ node, onRefresh }: { node: TreeNode; onRefresh: () => void }) {
  const d = node.data;
  const [tab, setTab] = useState<'latest' | 'input' | 'history'>('latest');
  const [metrics, setMetrics] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const template = DEVICE_PARAM_TEMPLATES[d?.device_type] || [];

  const loadLatest = async () => {
    const res = await fetch(`/api/admin/metrics?device_id=${d.id}`);
    const json = await res.json();
    if (json.success) setMetrics(json.data);
  };
  const loadHistory = async () => {
    const res = await fetch(`/api/admin/metrics?device_id=${d.id}&history=1&limit=20`);
    const json = await res.json();
    if (json.success) setHistory(json.data || []);
  };

  useEffect(() => { loadLatest(); }, [d?.id]);

  const submitParams = async () => {
    const params: Record<string, string> = {};
    template.forEach(p => {
      const val = paramValues[p.key];
      if (val) params[`${p.label}(${p.unit || ''})`] = val;
    });
    if (Object.keys(params).length === 0) return;
    await fetch('/api/admin/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_id: d.id, params }) });
    setParamValues({});
    setTab('latest');
    loadLatest();
  };

  const typeLabel = DEVICE_TYPE_LABELS[d?.device_type] || d?.device_type;
  const statusColor = d?.is_offline ? '#4a6485' : d?.is_fault ? '#ff4d6d' : d?.running_status === 'running' ? '#00ff88' : '#ffaa44';

  return (
    <div>
      <h2 style={{ fontSize: '16px', color: '#00d4ff', marginBottom: '8px' }}>{node.icon} {d?.name}</h2>
      <div style={{ fontSize: '12px', color: '#8aa5c4', marginBottom: '12px' }}>
        类型：{typeLabel} | 编号：#{d?.code} | 位置：{d?.location || '未设置'} |
        <span style={{ color: statusColor, fontWeight: 600, marginLeft: '6px' }}>
          {d?.is_offline ? '离线' : d?.is_fault ? '故障' : d?.running_status}
        </span>
      </div>

      {/* Tab */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
        {[
          { k: 'latest', label: '📊 最新数据' },
          { k: 'input', label: '📝 录入数据' },
          { k: 'history', label: '📜 历史数据' },
        ].map(t => (
          <button key={t.k} onClick={() => {
            setTab(t.k as any);
            if (t.k === 'latest') loadLatest();
            if (t.k === 'history') loadHistory();
          }} style={{
            ...btnPrimary, padding: '4px 10px', fontSize: '11px',
            background: tab === t.k ? '#00d4ff' : 'rgba(0,212,255,0.15)',
            color: tab === t.k ? '#02070f' : '#00d4ff',
          }}>{t.label}</button>
        ))}
        <button style={{ ...btnDanger, padding: '4px 10px', fontSize: '11px', marginLeft: 'auto' }} onClick={async () => {
          if (!confirm('删除此设备？')) return;
          await fetch(`/api/admin/devices?id=${d.id}`, { method: 'DELETE' });
          onRefresh();
        }}>删除设备</button>
      </div>

      {/* 最新数据 */}
      {tab === 'latest' && (
        <div>
          {metrics ? (
            <>
              <div style={{ fontSize: '10px', color: '#4a6485', marginBottom: '6px' }}>⏱ {metrics.timestamp}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {Object.entries(metrics.params || {}).map(([k, v]: any) => (
                  <div key={k} style={{ padding: '6px 8px', background: 'rgba(0,212,255,0.08)', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', color: '#8aa5c4' }}>{k}</div>
                    <div style={{ fontSize: '14px', color: '#00ffcc', fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ fontSize: '12px', color: '#4a6485', padding: '20px' }}>暂无时序数据，请点击「录入数据」</div>}
        </div>
      )}

      {/* 录入数据 */}
      {tab === 'input' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            {template.map(p => (
              <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#8aa5c4', whiteSpace: 'nowrap' }}>{p.label}</span>
                <input style={{ ...inputStyle, fontSize: '10px', padding: '3px 6px', width: '60px' }} placeholder={p.unit} value={paramValues[p.key] || ''} onChange={e => setParamValues(prev => ({ ...prev, [p.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <button style={{ ...btnPrimary, marginTop: '10px' }} onClick={submitParams}>提交参数</button>
        </div>
      )}

      {/* 历史数据 */}
      {tab === 'history' && (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {history.length > 0 ? history.map((h, i) => (
            <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
              <div style={{ fontSize: '10px', color: '#4a6485' }}>{h.timestamp}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(h.params || {}).map(([k, v]: any) => (
                  <span key={k} style={{ fontSize: '10px', color: '#8aa5c4' }}>{k}: <span style={{ color: '#00ffcc' }}>{v}</span></span>
                ))}
              </div>
            </div>
          )) : <div style={{ fontSize: '12px', color: '#4a6485', padding: '20px' }}>暂无历史数据</div>}
        </div>
      )}
    </div>
  );
}

// === 表计详情 ===
function MeterDetail({ node, onRefresh }: { node: TreeNode; onRefresh: () => void }) {
  const m = node.data;
  return (
    <div>
      <h2 style={{ fontSize: '16px', color: '#00d4ff', marginBottom: '8px' }}>⚡ {m?.name}</h2>
      <div style={{ fontSize: '12px', color: '#8aa5c4' }}>
        计量级别：{METER_LEVEL_LABELS[m?.meter_level] || m?.meter_level} | 编号：#{m?.code} | 位置：{m?.location || '未设置'}
      </div>
      <button style={{ ...btnDanger, marginTop: '10px', padding: '4px 10px', fontSize: '11px' }} onClick={async () => {
        if (!confirm('删除此表计？')) return;
        await fetch(`/api/admin/meters?id=${m.id}`, { method: 'DELETE' });
        onRefresh();
      }}>删除表计</button>
    </div>
  );
}

// === 项目详情 ===
function ProjectDetail({ node, onRefresh }: { node: TreeNode; onRefresh: () => void }) {
  const p = node.data;
  const childCount = node.children?.length || 0;
  const deviceCount = node.children?.filter(c => c.type === 'device').length || 0;
  const floorCount = node.children?.filter(c => c.type === 'floor').length || 0;
  const stationCount = node.children?.filter(c => c.type === 'station').length || 0;
  const meterCount = node.children?.filter(c => c.type === 'meter').length || 0;

  return (
    <div>
      <h2 style={{ fontSize: '16px', color: '#00d4ff', marginBottom: '8px' }}>📁 {p?.name}</h2>
      <div style={{ fontSize: '12px', color: '#8aa5c4', marginBottom: '12px' }}>
        {p?.province} › {p?.city}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {[
          { label: '冷站', count: stationCount, color: '#00d4ff' },
          { label: '楼层', count: floorCount, color: '#00ffcc' },
          { label: '表计', count: meterCount, color: '#ffaa44' },
          { label: '设备', count: deviceCount, color: '#00ff88' },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px', borderRadius: '6px', background: 'rgba(0,212,255,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: s.color, fontFamily: 'Orbitron' }}>{s.count}</div>
            <div style={{ fontSize: '10px', color: '#8aa5c4' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <button style={{ ...btnDanger, padding: '4px 10px', fontSize: '11px' }} onClick={async () => {
        if (!confirm('删除此项目及所有子数据？')) return;
        await fetch(`/api/admin/projects?id=${p.id}`, { method: 'DELETE' });
        onRefresh();
      }}>删除项目</button>
    </div>
  );
}
