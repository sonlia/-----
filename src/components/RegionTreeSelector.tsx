'use client';
import { useState, useMemo } from 'react';

/**
 * 三级树形区域选择器（省份 → 城市 → 项目）
 * 默认全部为「全部」，统计全国所有项目
 * 选中具体项目时通过 onChange 回调通知父组件
 */

// 区域数据树（省份 → 城市 → 项目）
const REGION_TREE: Record<string, Record<string, string[]>> = {
  '广东省': {
    '深圳市': ['深圳湾科技园', '前海中心', '福田CBD'],
    '广州市': ['天河智慧城', '琶洲互联网集聚区'],
    '东莞市': ['松山湖高新区'],
  },
  '江苏省': {
    '南京市': ['江北新区', '软件谷'],
    '苏州市': ['工业园区', '高新区'],
  },
  '浙江省': {
    '杭州市': ['未来科技城', '滨江高新区'],
    '宁波市': ['宁波高新区'],
  },
  '北京市': {
    '北京市': ['中关村', '望京SOHO', '亦庄经开区'],
  },
  '上海市': {
    '上海市': ['张江高科技园', '陆家嘴', '临港新片区'],
  },
  '山东省': {
    '济南市': ['齐鲁软件园'],
    '青岛市': ['蓝谷高新区'],
  },
};

const ALL = '全部';

interface RegionSelection {
  province: string;
  city: string;
  project: string;
  // 是否选中了具体项目（三级都不是"全部"）
  isSpecific: boolean;
}

export default function RegionTreeSelector({ onChange }: { onChange?: (sel: RegionSelection) => void } = {}) {
  const [province, setProvince] = useState(ALL);
  const [city, setCity] = useState(ALL);
  const [project, setProject] = useState(ALL);

  // 省份选项：全部 + 所有省份
  const provinceOptions = [ALL, ...Object.keys(REGION_TREE)];

  // 当前省份下的城市列表（选了具体省份才显示城市选项）
  const cityOptions = useMemo(() => {
    if (province === ALL) return [ALL];
    return [ALL, ...Object.keys(REGION_TREE[province] || {})];
  }, [province]);

  // 当前城市下的项目列表（选了具体城市才显示项目选项）
  const projectOptions = useMemo(() => {
    if (province === ALL || city === ALL) return [ALL];
    return [ALL, ...((REGION_TREE[province] || {})[city] || [])];
  }, [province, city]);

  // 通知父组件
  const notifyChange = (p: string, c: string, proj: string) => {
    if (onChange) {
      onChange({
        province: p, city: c, project: proj,
        isSpecific: p !== ALL && c !== ALL && proj !== ALL,
      });
    }
  };

  // 选择省份
  const onProvinceChange = (p: string) => {
    setProvince(p);
    setCity(ALL);
    setProject(ALL);
    notifyChange(p, ALL, ALL);
  };

  // 选择城市
  const onCityChange = (c: string) => {
    setCity(c);
    setProject(ALL);
    notifyChange(province, c, ALL);
  };

  // 选择项目
  const onProjectChange = (proj: string) => {
    setProject(proj);
    notifyChange(province, city, proj);
  };

  const selectStyle: React.CSSProperties = {
    padding: '4px 10px', fontSize: '11px', fontWeight: 600,
    background: 'var(--bg-panel)', color: 'var(--primary)',
    border: '1px solid var(--border-line)', borderRadius: '4px',
    cursor: 'pointer', outline: 'none',
    fontFamily: 'Rajdhani', letterSpacing: '0.5px',
  };

  return (
    <div style={{
      display: 'flex', gap: '8px', alignItems: 'center',
      background: 'var(--bg-panel)', border: '1px solid var(--border-line)',
      borderRadius: '6px', padding: '8px 16px', backdropFilter: 'blur(14px)',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '1px' }}>📍 区域</span>
      {/* 省份 */}
      <select value={province} onChange={(e) => onProvinceChange(e.target.value)} style={selectStyle}>
        {provinceOptions.map(p => (
          <option key={p} value={p} style={{ background: '#0a1a2e', color: '#e8f4ff' }}>{p}</option>
        ))}
      </select>
      <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>›</span>
      {/* 城市（省份选"全部"时只显示"全部"） */}
      <select value={city} onChange={(e) => onCityChange(e.target.value)} style={selectStyle}>
        {cityOptions.map(c => (
          <option key={c} value={c} style={{ background: '#0a1a2e', color: '#e8f4ff' }}>{c}</option>
        ))}
      </select>
      <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>›</span>
      {/* 项目（城市选"全部"时只显示"全部"） */}
      <select value={project} onChange={(e) => onProjectChange(e.target.value)} style={selectStyle}>
        {projectOptions.map(p => (
          <option key={p} value={p} style={{ background: '#0a1a2e', color: '#e8f4ff' }}>{p}</option>
        ))}
      </select>
    </div>
  );
}
