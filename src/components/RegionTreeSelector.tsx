'use client';
import { useState, useMemo } from 'react';

/**
 * 三级树形区域选择器（省份 → 城市 → 项目）
 * 替代原来的时间维度+区域两个下拉框
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

export default function RegionTreeSelector() {
  const [province, setProvince] = useState('广东省');
  const [city, setCity] = useState('深圳市');
  const [project, setProject] = useState('深圳湾科技园');

  // 当前省份下的城市列表
  const cities = useMemo(() => {
    return Object.keys(REGION_TREE[province] || {});
  }, [province]);

  // 当前城市下的项目列表
  const projects = useMemo(() => {
    return (REGION_TREE[province] || {})[city] || [];
  }, [province, city]);

  // 选择省份时，自动选第一个城市和项目
  const onProvinceChange = (p: string) => {
    setProvince(p);
    const cityList = Object.keys(REGION_TREE[p] || {});
    const firstCity = cityList[0] || '';
    setCity(firstCity);
    const projList = (REGION_TREE[p] || {})[firstCity] || [];
    setProject(projList[0] || '');
  };

  // 选择城市时，自动选第一个项目
  const onCityChange = (c: string) => {
    setCity(c);
    const projList = (REGION_TREE[province] || {})[c] || [];
    setProject(projList[0] || '');
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
        {Object.keys(REGION_TREE).map(p => (
          <option key={p} value={p} style={{ background: '#0a1a2e', color: '#e8f4ff' }}>{p}</option>
        ))}
      </select>
      <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>›</span>
      {/* 城市 */}
      <select value={city} onChange={(e) => onCityChange(e.target.value)} style={selectStyle}>
        {cities.map(c => (
          <option key={c} value={c} style={{ background: '#0a1a2e', color: '#e8f4ff' }}>{c}</option>
        ))}
      </select>
      <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>›</span>
      {/* 项目 */}
      <select value={project} onChange={(e) => setProject(e.target.value)} style={selectStyle}>
        {projects.map(p => (
          <option key={p} value={p} style={{ background: '#0a1a2e', color: '#e8f4ff' }}>{p}</option>
        ))}
      </select>
    </div>
  );
}
