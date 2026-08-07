'use client';
import { useMemo, useState } from 'react';
import EChart, { PALETTE, commonGrid, commonTooltip, commonAxis } from './EChart';

interface AirConditioningPanelProps { kpiPower: string; }

// 下拉框选择器组件（复用）
function PanelSelector({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '1px' }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '4px 10px', fontSize: '11px', fontWeight: 600,
          background: 'var(--bg-panel)', color: 'var(--primary)',
          border: '1px solid var(--border-line)', borderRadius: '4px',
          cursor: 'pointer', outline: 'none',
          fontFamily: 'Rajdhani', letterSpacing: '0.5px',
        }}
      >
        {options.map(opt => <option key={opt} value={opt} style={{ background: '#0a1a2e', color: '#e8f4ff' }}>{opt}</option>)}
      </select>
    </div>
  );
}

export default function AirConditioningPanel({ kpiPower }: AirConditioningPanelProps) {
  const [timeRange, setTimeRange] = useState('今日');
  const [zone, setZone] = useState('全部区域');
  const [floor, setFloor] = useState('全部楼层');

  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };
  const multiplier = timeRange === '今日' ? 1 : timeRange === '本周' ? 7 : timeRange === '本月' ? 30 : 365;

  // 空调总功率
  const acTotalPower = 45.6;
  const acCount = 54;
  const acOnCount = 48;
  const avgTemp = 24;
  const energySave = 12.8 * multiplier;

  // 1. 24h 温度趋势（室内 vs 室外 vs 设定温度）
  const tempTrendOption = useMemo(() => {
    const hours = Array.from({ length: 25 }, (_, i) => i + ':00');
    const indoor = hours.map((_, i) => {
      const base = 24;
      const variation = Math.sin((i - 6) / 24 * Math.PI * 2) * 1.5;
      return +(base + variation).toFixed(1);
    });
    const outdoor = hours.map((_, i) => {
      if (i < 6 || i > 18) return +(15 + Math.random() * 3).toFixed(1);
      return +(20 + Math.sin((i - 6) / 12 * Math.PI) * 12).toFixed(1);
    });
    const setting = hours.map(() => 24);
    return {
      tooltip: { ...commonTooltip, trigger: 'axis' },
      legend: { data: ['室内温度', '室外温度', '设定温度'], textStyle: { color: PALETTE.textMid, fontSize: 9 }, top: 0, right: 0, itemWidth: 12, itemHeight: 8 },
      grid: { ...commonGrid, left: 36, right: 16, top: 24, bottom: 24 },
      xAxis: { type: 'category', data: hours, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, interval: 4 } },
      yAxis: { type: 'value', name: '°C', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [
        { name: '室内温度', type: 'line', smooth: true, symbol: 'none', data: indoor, lineStyle: { color: PALETTE.cyanGlow, width: 2 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,255,204,0.2)' }, { offset: 1, color: 'rgba(0,255,204,0)' }] } } },
        { name: '室外温度', type: 'line', smooth: true, symbol: 'none', data: outdoor, lineStyle: { color: PALETTE.warn, width: 2 } },
        { name: '设定温度', type: 'line', symbol: 'none', data: setting, lineStyle: { color: PALETTE.danger, type: 'dashed', width: 1.5 } },
      ],
    };
  }, []);

  // 2. 能耗对比（节能模式 vs 普通模式）
  const compareOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'axis' },
    legend: { data: ['普通模式', '节能模式'], textStyle: { color: PALETTE.textMid, fontSize: 9 }, top: 0, right: 0, itemWidth: 12, itemHeight: 8 },
    grid: { ...commonGrid, left: 36, right: 16, top: 24, bottom: 24 },
    xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'], ...commonAxis },
    yAxis: { type: 'value', name: 'kWh', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
    series: [
      { name: '普通模式', type: 'bar', data: [320, 335, 340, 325, 330, 280, 275], itemStyle: { color: PALETTE.danger, borderRadius: [3, 3, 0, 0] }, barWidth: 12 },
      { name: '节能模式', type: 'bar', data: [265, 278, 282, 270, 275, 232, 228], itemStyle: { color: PALETTE.success, borderRadius: [3, 3, 0, 0] }, barWidth: 12 },
    ],
  }), []);

  // 3. 各区域空调使用情况
  const zoneOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'axis' },
    grid: { ...commonGrid, left: 50, right: 16, top: 14, bottom: 24 },
    xAxis: { type: 'value', ...commonAxis },
    yAxis: { type: 'category', data: ['1F大厅', '2F办公区', '3F会议区', '4F机房', '5F餐厅'], ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9 } },
    series: [{
      type: 'bar', data: [
        { value: 8.5, itemStyle: { color: PALETTE.cyanGlow } },
        { value: 12.3, itemStyle: { color: PALETTE.primary } },
        { value: 6.8, itemStyle: { color: PALETTE.success } },
        { value: 15.2, itemStyle: { color: PALETTE.warn } },
        { value: 5.4, itemStyle: { color: PALETTE.danger } },
      ],
      barWidth: 10,
      label: { show: true, position: 'right', color: PALETTE.textMid, fontSize: 9, fontFamily: 'Orbitron', formatter: '{c} kW' },
    }],
  }), []);

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 40, overflow: 'hidden' }}>
      {/* 下拉框选择器 */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border-line)', borderRadius: '6px', padding: '8px 16px', backdropFilter: 'blur(14px)' }}>
        <PanelSelector label="时间维度" options={['今日', '本周', '本月', '本年']} value={timeRange} onChange={setTimeRange} />
        <PanelSelector label="区域" options={['全部区域', '1F大厅', '2F办公区', '3F会议区', '4F机房', '5F餐厅']} value={zone} onChange={setZone} />
        <PanelSelector label="楼层" options={['全部楼层', '1F', '2F', '3F', '4F', '5F']} value={floor} onChange={setFloor} />
      </div>

      {/* 顶部 4 KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
        {[
          { label: '空调总功率', value: acTotalPower, unit: 'kW', sub: `${acOnCount}/${acCount} 台运行`, color: PALETTE.cyanGlow, icon: '❄' },
          { label: '平均温度', value: avgTemp, unit: '°C', sub: '舒适区间 22-26°C', color: PALETTE.primary, icon: '🌡' },
          { label: '累计节能', value: energySave, unit: 'kWh', sub: '同比 ⬇ 15.2%', color: PALETTE.success, icon: '🌱' },
          { label: '运行时长', value: (8.5 * multiplier).toFixed(1), unit: 'h', sub: '日均 8.5 小时', color: PALETTE.warn, icon: '⏱' },
        ].map((kpi, i) => (
          <div key={i} className="panel" style={{ ...panelStyle, position: 'relative', overflow: 'hidden' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '2px' }}>
              <span style={{ fontSize: '16px' }}>{kpi.icon}</span>{kpi.label}
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '28px', fontWeight: 700, color: kpi.color, textShadow: `0 0 16px ${kpi.color}50`, lineHeight: 1.1 }}>
              {kpi.value}<span style={{ fontSize: '13px', color: 'var(--text-dim)', marginLeft: '4px' }}>{kpi.unit}</span>
            </div>
            <div style={{ fontSize: '10px', color: kpi.color, marginTop: '4px', opacity: 0.8 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* 主图区 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '14px', minHeight: 0 }}>
        {/* 温度趋势 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>🌡 温度趋势 (24h)</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={tempTrendOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
        {/* 能耗对比 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>📊 能耗对比</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={compareOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
        {/* 区域使用 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>🏢 各区域功率</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={zoneOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
