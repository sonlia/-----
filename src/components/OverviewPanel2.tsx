'use client';
import { useMemo } from 'react';
import EChart, { PALETTE, commonGrid, commonTooltip, commonAxis } from './EChart';
import ChinaMap from './ChinaMap';

interface OverviewPanel2Props { kpiPower: string; }

export default function OverviewPanel2({ kpiPower }: OverviewPanel2Props) {
  const power = parseFloat(kpiPower || '0');
  const totalLoad = power + 18.6;
  const pvOutput = 32.5;
  const chargingLoad = 18.6;
  const acLoad = power;
  const buildingLoad = 18.4;
  const gridLoad = 52.0;
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };

  // 1. 各子系统功率占比饼图
  const pieOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'item', formatter: '{b}: {c} kW ({d}%)' },
    legend: { orient: 'vertical', right: 4, top: 'middle', textStyle: { color: PALETTE.textMid, fontSize: 10 }, itemWidth: 8, itemHeight: 8 },
    series: [{
      type: 'pie', radius: ['48%', '72%'], center: ['35%', '50%'],
      itemStyle: { borderColor: '#02070f', borderWidth: 2 },
      label: { color: PALETTE.textMain, fontSize: 10, fontFamily: 'Orbitron' },
      data: [
        { value: gridLoad, name: '配电网', itemStyle: { color: PALETTE.primary } },
        { value: pvOutput, name: '光伏', itemStyle: { color: '#ff8844' } },
        { value: chargingLoad, name: '充电桩', itemStyle: { color: PALETTE.success } },
        { value: acLoad, name: '空调节能', itemStyle: { color: PALETTE.danger } },
        { value: buildingLoad, name: '楼宇控制', itemStyle: { color: PALETTE.cyanGlow } },
      ],
    }],
  }), []);

  // 2. 能效雷达图
  const radarOption = useMemo(() => ({
    tooltip: { ...commonTooltip },
    legend: { data: ['当前', '目标'], textStyle: { color: PALETTE.textMid, fontSize: 10 }, top: 0, right: 0, itemWidth: 10, itemHeight: 6 },
    radar: {
      indicator: [
        { name: '配电网', max: 100 },
        { name: '光伏', max: 100 },
        { name: '充电桩', max: 100 },
        { name: '空调节能', max: 100 },
        { name: '楼宇控制', max: 100 },
        { name: '碳监测', max: 100 },
      ],
      center: ['50%', '55%'], radius: '62%',
      axisName: { color: PALETTE.textMid, fontSize: 10, fontFamily: 'Rajdhani' },
      splitLine: { lineStyle: { color: 'rgba(0,212,255,0.15)' } },
      splitArea: { areaStyle: { color: ['rgba(0,212,255,0.02)', 'rgba(0,212,255,0.04)'] } },
      axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } },
    },
    series: [{
      type: 'radar',
      data: [
        { value: [82, 76, 88, 71, 85, 90], name: '当前', areaStyle: { color: 'rgba(0,212,255,0.25)' }, lineStyle: { color: PALETTE.primary, width: 2 }, itemStyle: { color: PALETTE.primary } },
        { value: [90, 85, 92, 85, 90, 95], name: '目标', areaStyle: { color: 'rgba(0,255,136,0.12)' }, lineStyle: { color: PALETTE.success, width: 1.5, type: 'dashed' }, itemStyle: { color: PALETTE.success } },
      ],
    }],
  }), []);

  // 3. 24h 总负荷趋势
  const trendOption = useMemo(() => {
    const hours = Array.from({ length: 25 }, (_, i) => i + ':00');
    return {
      tooltip: { ...commonTooltip, trigger: 'axis' },
      legend: { data: ['总负荷', '光伏', '充电桩', '空调'], textStyle: { color: PALETTE.textMid, fontSize: 9 }, top: 0, right: 0, itemWidth: 8, itemHeight: 6 },
      grid: { ...commonGrid, left: 36, right: 12, top: 26, bottom: 24 },
      xAxis: { type: 'category', data: hours, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9, interval: 4 } },
      yAxis: { type: 'value', name: 'kW', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [
        { name: '总负荷', type: 'line', smooth: true, symbol: 'none', data: hours.map((_, i) => +(totalLoad * (0.4 + 0.6 * Math.max(0, Math.sin((i - 6) / 24 * Math.PI * 2 + Math.PI / 2)))).toFixed(1)), lineStyle: { color: PALETTE.warn, width: 2.5 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,170,68,0.3)' }, { offset: 1, color: 'rgba(255,170,68,0)' }] } } },
        { name: '光伏', type: 'line', smooth: true, symbol: 'none', data: hours.map((_, i) => i >= 6 && i <= 18 ? +(pvOutput * Math.sin((i - 6) / 12 * Math.PI)).toFixed(1) : 0), lineStyle: { color: '#ff8844', width: 2 } },
        { name: '充电桩', type: 'line', smooth: true, symbol: 'none', data: hours.map((_, i) => +(chargingLoad * (0.5 + 0.5 * Math.sin((i - 9) / 24 * Math.PI * 2))).toFixed(1)), lineStyle: { color: PALETTE.success, width: 2 } },
        { name: '空调', type: 'line', smooth: true, symbol: 'none', data: hours.map((_, i) => +(acLoad * (0.4 + 0.6 * Math.max(0, Math.sin((i - 6) / 24 * Math.PI * 2 + Math.PI / 2)))).toFixed(1)), lineStyle: { color: PALETTE.danger, width: 2 } },
      ],
    };
  }, [totalLoad]);

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40, overflow: 'hidden' }}>
      {/* 顶部 KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
        {[
          { label: '配电网', value: gridLoad.toFixed(1), unit: 'kW', sub: '4段母线', color: PALETTE.primary, icon: '⚡' },
          { label: '光伏发电', value: pvOutput.toFixed(1), unit: 'kW', sub: '日发电 260kWh', color: '#ff8844', icon: '☀' },
          { label: '充电桩', value: chargingLoad.toFixed(1), unit: 'kW', sub: '1,459桩在线', color: PALETTE.success, icon: '🔌' },
          { label: '空调节能', value: acLoad.toFixed(1), unit: 'kW', sub: '21台运行', color: PALETTE.danger, icon: '❄' },
          { label: '楼宇控制', value: buildingLoad.toFixed(1), unit: 'kW', sub: '75台设备', color: PALETTE.cyanGlow, icon: '🏢' },
        ].map((kpi, i) => (
          <div key={i} className="panel" style={{ ...panelStyle, borderLeft: `3px solid ${kpi.color}` }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '14px' }}>{kpi.icon}</span>{kpi.label}
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '24px', fontWeight: 700, color: kpi.color, textShadow: `0 0 12px ${kpi.color}40`, lineHeight: 1.1 }}>
              {kpi.value}<span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: '3px' }}>{kpi.unit}</span>
            </div>
            <div style={{ fontSize: '9px', color: kpi.color, marginTop: '3px', opacity: 0.8 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* 主图区：中国地图 + 子系统总览 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '10px', minHeight: 0 }}>
        {/* 中国地图 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, letterSpacing: '1px' }}>🇨🇳 全国省级负荷分布</span>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>颜色深浅 = 总负荷 · 点击省份查看详情</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChinaMap height="100%" />
          </div>
        </div>
        {/* 子系统功率占比 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>📊 各子系统功率占比</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={pieOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
      </div>

      {/* 底部 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px', minHeight: '200px' }}>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>📈 24h 各子系统负荷趋势 (kW)</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={trendOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>🎯 子系统综合能效雷达</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={radarOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
