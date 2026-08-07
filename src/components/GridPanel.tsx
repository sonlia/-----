'use client';
import ModuleSelector from './ModuleSelector';
import { useMemo, useState } from 'react';
import EChart, { PALETTE, commonGrid, commonTooltip, commonAxis } from './EChart';

interface GridPanelProps { kpiPower: string; }

const BUSES = [
  { name: 'I段母线', voltage: 10.05, current: 222.5, load: 38.5, cap: 60, demand: 42.0, powerFactor: 0.92, color: PALETTE.primary },
  { name: 'II段母线', voltage: 10.02, current: 145.8, load: 25.2, cap: 50, demand: 28.5, powerFactor: 0.89, color: PALETTE.cyanGlow },
  { name: 'III段母线', voltage: 9.98, current: 107.6, load: 18.6, cap: 40, demand: 22.0, powerFactor: 0.85, color: PALETTE.warn },
  { name: '光伏母线', voltage: 0.38, current: 85.5, load: 32.5, cap: 50, demand: 35.0, powerFactor: 0.95, color: '#ff8844' },
];

export default function GridPanel({ kpiPower }: GridPanelProps) {
  const [selTime, setSelTime] = useState('今日');
  const [selZone, setSelZone] = useState('全部区域');
  const power = parseFloat(kpiPower || '0');
  const totalLoad = BUSES.reduce((s, b) => s + b.load, 0);
  const totalCurrent = BUSES.reduce((s, b) => s + b.current, 0);
  const totalDemand = BUSES.reduce((s, b) => s + b.demand, 0);
  const avgPowerFactor = (BUSES.reduce((s, b) => s + b.powerFactor, 0) / BUSES.length).toFixed(3);
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };

  // 1. 母线电压/电流对比
  const voltageCurrentOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'axis' },
    legend: { data: ['电压(kV)', '电流(A)'], textStyle: { color: PALETTE.textMid, fontSize: 10 }, top: 0, right: 0, itemWidth: 10, itemHeight: 6 },
    grid: { ...commonGrid, left: 40, right: 40, top: 26, bottom: 24 },
    xAxis: { type: 'category', data: BUSES.map(b => b.name), ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9 } },
    yAxis: [
      { type: 'value', name: 'kV', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      { type: 'value', name: 'A', nameTextStyle: { color: PALETTE.textDim, fontSize: 9 }, axisLabel: { color: PALETTE.textMid, fontSize: 9 }, splitLine: { show: false } },
    ],
    series: [
      { name: '电压(kV)', type: 'bar', barWidth: 16, data: BUSES.map(b => b.voltage), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.primary }, { offset: 1, color: PALETTE.primaryDeep }] }, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top', color: PALETTE.primary, fontSize: 10, fontFamily: 'Orbitron' } },
      { name: '电流(A)', type: 'line', smooth: true, symbol: 'circle', symbolSize: 8, yAxisIndex: 1, data: BUSES.map(b => b.current), lineStyle: { color: PALETTE.warn, width: 2 }, itemStyle: { color: PALETTE.warn, borderColor: '#02070f', borderWidth: 2 } },
    ],
  }), []);

  // 2. 母线负载与需量
  const loadDemandOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'axis' },
    legend: { data: ['当前负载', '申报需量', '额定容量'], textStyle: { color: PALETTE.textMid, fontSize: 10 }, top: 0, right: 0, itemWidth: 10, itemHeight: 6 },
    grid: { ...commonGrid, left: 36, right: 12, top: 26, bottom: 24 },
    xAxis: { type: 'category', data: BUSES.map(b => b.name), ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9 } },
    yAxis: { type: 'value', name: 'kW', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
    series: [
      { name: '额定容量', type: 'bar', barWidth: 24, data: BUSES.map(b => b.cap), itemStyle: { color: 'rgba(0,212,255,0.08)', borderRadius: [4, 4, 0, 0] } },
      { name: '申报需量', type: 'bar', barWidth: 24, data: BUSES.map(b => b.demand), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.warn }, { offset: 1, color: PALETTE.warn + '40' }] }, borderRadius: [4, 4, 0, 0] } },
      { name: '当前负载', type: 'bar', barWidth: 24, data: BUSES.map(b => b.load), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.success }, { offset: 1, color: PALETTE.success + '40' }] }, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: 'top', color: PALETTE.success, fontSize: 10, fontFamily: 'Orbitron' } },
    ],
  }), []);

  // 3. 功率因数仪表盘
  const powerFactorOption = useMemo(() => ({
    series: BUSES.map((b, i) => ({
      type: 'gauge', radius: '45%', center: [[`${15 + i * 25}%`], ['55%']],
      startAngle: 200, endAngle: -20, min: 0.5, max: 1.0,
      progress: { show: true, width: 6, itemStyle: { color: b.powerFactor > 0.9 ? PALETTE.success : b.powerFactor > 0.85 ? PALETTE.warn : PALETTE.danger } },
      axisLine: { lineStyle: { width: 6, color: [[1, 'rgba(0,212,255,0.08)']] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      pointer: { width: 2, length: '55%', itemStyle: { color: b.color } },
      anchor: { show: true, size: 6, itemStyle: { color: b.color } },
      title: { offsetCenter: [0, '25%'], color: PALETTE.textMid, fontSize: 9, fontFamily: 'Rajdhani' },
      detail: { valueAnimation: true, offsetCenter: [0, '-5%'], formatter: '{value}', color: b.color, fontSize: 14, fontFamily: 'Orbitron', fontWeight: 700 },
      data: [{ value: b.powerFactor, name: b.name.replace('母线', '') }],
    })),
  }), []);

  // 4. 24h 电压趋势
  const voltageTrendOption = useMemo(() => {
    const hours = Array.from({ length: 25 }, (_, i) => i + ':00');
    return {
      tooltip: { ...commonTooltip, trigger: 'axis' },
      legend: { data: BUSES.map(b => b.name), textStyle: { color: PALETTE.textMid, fontSize: 9 }, top: 0, right: 0, itemWidth: 8, itemHeight: 6 },
      grid: { ...commonGrid, left: 36, right: 12, top: 26, bottom: 24 },
      xAxis: { type: 'category', data: hours, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9, interval: 4 } },
      yAxis: { type: 'value', name: 'kV', min: 9.5, max: 10.5, ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: BUSES.slice(0, 3).map((b, i) => ({
        name: b.name, type: 'line', smooth: true, symbol: 'none',
        data: hours.map((_, h) => +(b.voltage + Math.sin(h / 4 + i) * 0.03 + (Math.random() * 0.02 - 0.01)).toFixed(3)),
        lineStyle: { color: b.color, width: 1.5 }, itemStyle: { color: b.color },
      })),
    };
  }, []);

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40, overflow: 'hidden' }}>
      <ModuleSelector selectors={[{ label: '时间维度', options: ['今日', '本周', '本月', '本年'], value: selTime, onChange: setSelTime }, { label: '区域', options: ['全部区域', '1F大厅', '2F办公区', '3F会议区', '4F机房', '5F餐厅'], value: selZone, onChange: setSelZone }]} />
      {/* 顶部 KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
        {[
          { label: '总负荷', value: totalLoad.toFixed(1), unit: 'kW', sub: `容量 ${BUSES.reduce((s, b) => s + b.cap, 0)} kW`, color: PALETTE.warn, icon: '⚡' },
          { label: '总电流', value: totalCurrent.toFixed(1), unit: 'A', sub: '4段母线合计', color: PALETTE.primary, icon: '🔌' },
          { label: '总需量', value: totalDemand.toFixed(1), unit: 'kW', sub: `负载率 ${(totalLoad/totalDemand*100).toFixed(1)}%`, color: PALETTE.cyanGlow, icon: '📊' },
          { label: '平均功率因数', value: avgPowerFactor, unit: '', sub: '4段母线均值', color: PALETTE.success, icon: 'cosφ' },
          { label: '光伏并网', value: '32.5', unit: 'kW', sub: '光伏母线', color: '#ff8844', icon: '☀' },
          { label: '需量电费', value: '¥486', unit: '/日', sub: '按需量计费', color: PALETTE.warn, icon: '💰' },
        ].map((kpi, i) => (
          <div key={i} className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '14px' }}>{kpi.icon}</span>{kpi.label}
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, color: kpi.color, textShadow: `0 0 12px ${kpi.color}40`, lineHeight: 1.1 }}>
              {kpi.value}<span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '3px' }}>{kpi.unit}</span>
            </div>
            <div style={{ fontSize: '9px', color: kpi.color, marginTop: '3px', opacity: 0.8 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* 主图区 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', minHeight: 0 }}>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>📊 各母线电压与电流</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={voltageCurrentOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>📊 各母线负载与需量对比</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={loadDemandOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
      </div>

      {/* 底部 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr', gap: '10px', minHeight: '180px' }}>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>cosφ 各母线功率因数</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={powerFactorOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>📈 24h 母线电压趋势 (kV)</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={voltageTrendOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
