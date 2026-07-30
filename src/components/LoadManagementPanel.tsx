'use client';
import { useMemo } from 'react';
import EChart, { PALETTE, commonGrid, commonTooltip, commonAxis } from './EChart';

interface LoadManagementPanelProps { kpiPower: string; }

// 母线数据
const BUSES = [
  { name: 'I段母线', load: 38.5, cap: 60, controllable: 18.2, fast: 8.5, slow: 9.7, revenue: 186, color: PALETTE.primary },
  { name: 'II段母线', load: 25.2, cap: 50, controllable: 12.4, fast: 5.2, slow: 7.2, revenue: 124, color: PALETTE.cyanGlow },
  { name: 'III段母线', load: 18.6, cap: 40, controllable: 8.5, fast: 3.8, slow: 4.7, revenue: 92, color: PALETTE.warn },
  { name: '光伏母线', load: 32.5, cap: 50, controllable: 25.0, fast: 18.5, slow: 6.5, revenue: 245, color: '#ff8844' },
];

// 各负荷类型
const LOAD_TYPES = [
  { name: '照明', total: 12.5, controllable: 8.5, color: PALETTE.warn, desc: 'LED 可调光' },
  { name: '空调', total: 28.6, controllable: 18.4, color: PALETTE.danger, desc: '变频+启停' },
  { name: '充电桩', total: 18.6, controllable: 15.2, color: PALETTE.success, desc: '有序充电' },
  { name: '储能', total: 8.5, controllable: 8.5, color: PALETTE.cyanGlow, desc: '双向充放' },
  { name: '动力', total: 6.8, controllable: 0, color: PALETTE.textDim, desc: '不可调' },
  { name: '其他', total: 4.2, controllable: 0, color: '#4a6485', desc: '不可调' },
];

export default function LoadManagementPanel({ kpiPower }: LoadManagementPanelProps) {
  const power = parseFloat(kpiPower || '0');
  const totalLoad = BUSES.reduce((s, b) => s + b.load, 0);
  const totalControllable = BUSES.reduce((s, b) => s + b.controllable, 0);
  const totalCapacity = BUSES.reduce((s, b) => s + b.cap, 0);
  const controllableRate = (totalControllable / totalLoad * 100).toFixed(1);
  const loadRate = (totalLoad / totalCapacity * 100).toFixed(1);
  const totalRevenue = BUSES.reduce((s, b) => s + b.revenue, 0);
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };

  // 1. 母线负载与可调容量对比（堆叠柱状图）
  const busBarOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'axis', formatter: (params: any) => {
      const bus = BUSES[params[0].dataIndex];
      return `<b style="color:${PALETTE.primary}">${bus.name}</b><br/>当前负载: <b style="color:${PALETTE.warn}">${bus.load} kW</b> / 容量 ${bus.cap} kW (${(bus.load/bus.cap*100).toFixed(1)}%)<br/>可调容量: <b style="color:${PALETTE.success}">${bus.controllable} kW</b><br/>&nbsp;&nbsp;快调: ${bus.fast} kW · 慢调: ${bus.slow} kW<br/>调节收益: <b style="color:${PALETTE.warn}">¥${bus.revenue}/日</b>`;
    }},
    legend: { data: ['负载', '快调容量', '慢调容量', '剩余容量'], textStyle: { color: PALETTE.textMid, fontSize: 10 }, top: 0, right: 0, itemWidth: 10, itemHeight: 6 },
    grid: { ...commonGrid, left: 40, right: 16, top: 30, bottom: 24 },
    xAxis: { type: 'category', data: BUSES.map(b => b.name), ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 10 } },
    yAxis: { type: 'value', name: 'kW', max: Math.max(...BUSES.map(b => b.cap)), ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
    series: [
      { name: '负载', type: 'bar', stack: 'a', barWidth: 28, data: BUSES.map(b => b.load), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.warn }, { offset: 1, color: PALETTE.warn + '60' }] } }, label: { show: true, position: 'inside', color: '#fff', fontSize: 10, fontFamily: 'Orbitron', fontWeight: 700, formatter: '{c}' } },
      { name: '快调容量', type: 'bar', stack: 'a', barWidth: 28, data: BUSES.map(b => b.fast), itemStyle: { color: PALETTE.success } },
      { name: '慢调容量', type: 'bar', stack: 'a', barWidth: 28, data: BUSES.map(b => b.slow), itemStyle: { color: PALETTE.cyanGlow } },
      { name: '剩余容量', type: 'bar', stack: 'a', barWidth: 28, data: BUSES.map(b => b.cap - b.load), itemStyle: { color: 'rgba(0,212,255,0.08)' } },
    ],
  }), []);

  // 2. 各负荷类型可控占比（横向堆叠条）
  const loadTypeOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: any) => {
      const idx = params[0].dataIndex;
      const lt = LOAD_TYPES[idx];
      return `<b style="color:${lt.color}">${lt.name}</b> - ${lt.desc}<br/>总功率: <b>${lt.total} kW</b><br/>可控: <b style="color:${PALETTE.success}">${lt.controllable} kW</b> (${(lt.controllable/lt.total*100).toFixed(0)}%)`;
    }},
    legend: { data: ['可控', '不可控'], textStyle: { color: PALETTE.textMid, fontSize: 10 }, top: 0, right: 0, itemWidth: 10, itemHeight: 6 },
    grid: { ...commonGrid, left: 50, right: 60, top: 26, bottom: 18 },
    xAxis: { type: 'value', name: 'kW', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
    yAxis: { type: 'category', data: LOAD_TYPES.map(l => l.name), ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 11 } },
    series: [
      { name: '可控', type: 'bar', stack: 't', barWidth: 14, data: LOAD_TYPES.map(l => ({ value: l.controllable, itemStyle: { color: l.color, borderRadius: [0, 0, 0, 0] } })), label: { show: true, position: 'inside', color: '#fff', fontSize: 9, fontFamily: 'Orbitron', formatter: (p: any) => p.value > 0 ? p.value : '' } },
      { name: '不可控', type: 'bar', stack: 't', barWidth: 14, data: LOAD_TYPES.map(l => ({ value: l.total - l.controllable, itemStyle: { color: l.color + '30', borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: PALETTE.textMid, fontSize: 9, fontFamily: 'Orbitron', formatter: (p: any) => LOAD_TYPES[p.dataIndex].total + ' kW' } },
    ],
  }), []);

  // 3. 24h 负荷曲线 + 可调区间（面积堆叠）
  const dailyOption = useMemo(() => {
    const hours = Array.from({ length: 25 }, (_, i) => i + ':00');
    const base = hours.map((_, i) => totalLoad * (0.4 + 0.6 * Math.sin((i - 6) / 24 * Math.PI * 2 + Math.PI / 2)));
    const controllableArea = hours.map((_, i) => totalControllable * (0.3 + 0.7 * Math.sin((i - 6) / 24 * Math.PI * 2 + Math.PI / 2)));
    const cap = hours.map(() => totalCapacity);
    return {
      tooltip: { ...commonTooltip, trigger: 'axis', formatter: (params: any) => `${params[0].name}<br/>${params.map((p: any) => `<span style="display:inline-block;width:10px;height:10px;background:${p.color};border-radius:50%;margin-right:6px"></span>${p.seriesName}: <b>${p.value.toFixed(1)} kW</b>`).join('<br/>')}` },
      legend: { data: ['总容量', '当前负荷', '可调容量'], textStyle: { color: PALETTE.textMid, fontSize: 10 }, top: 0, right: 0, itemWidth: 10, itemHeight: 6 },
      grid: { ...commonGrid, left: 38, right: 16, top: 30, bottom: 24 },
      xAxis: { type: 'category', data: hours, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9, interval: 4 } },
      yAxis: { type: 'value', name: 'kW', max: totalCapacity * 1.05, ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [
        { name: '总容量', type: 'line', symbol: 'none', data: cap, lineStyle: { color: PALETTE.danger, type: 'dashed', width: 1.5 }, itemStyle: { color: PALETTE.danger } },
        { name: '当前负荷', type: 'line', smooth: true, symbol: 'none', data: base, lineStyle: { color: PALETTE.warn, width: 2.5 }, itemStyle: { color: PALETTE.warn }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,170,68,0.35)' }, { offset: 1, color: 'rgba(255,170,68,0)' }] } } },
        { name: '可调容量', type: 'line', smooth: true, symbol: 'none', data: controllableArea, lineStyle: { color: PALETTE.success, width: 2 }, itemStyle: { color: PALETTE.success }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,255,136,0.4)' }, { offset: 1, color: 'rgba(0,255,136,0)' }] } } },
      ],
    };
  }, [totalLoad, totalControllable, totalCapacity]);

  // 4. 需求响应策略对比（雷达图）
  const strategyOption = useMemo(() => ({
    tooltip: { ...commonTooltip },
    legend: { data: ['当前能力', '目标值'], textStyle: { color: PALETTE.textMid, fontSize: 10 }, top: 0, right: 0, itemWidth: 10, itemHeight: 6 },
    radar: {
      indicator: [
        { name: '响应速度', max: 100 },
        { name: '调节深度', max: 100 },
        { name: '调节精度', max: 100 },
        { name: '持续性', max: 100 },
        { name: '经济性', max: 100 },
        { name: '可靠性', max: 100 },
      ],
      center: ['50%', '55%'], radius: '60%',
      axisName: { color: PALETTE.textMid, fontSize: 10, fontFamily: 'Rajdhani' },
      splitLine: { lineStyle: { color: 'rgba(0,212,255,0.15)' } },
      splitArea: { areaStyle: { color: ['rgba(0,212,255,0.02)', 'rgba(0,212,255,0.04)'] } },
      axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } },
    },
    series: [{
      type: 'radar',
      data: [
        { value: [72, 68, 78, 65, 75, 82], name: '当前能力', areaStyle: { color: 'rgba(0,212,255,0.25)' }, lineStyle: { color: PALETTE.primary, width: 2 }, itemStyle: { color: PALETTE.primary } },
        { value: [85, 80, 85, 80, 85, 90], name: '目标值', areaStyle: { color: 'rgba(0,255,136,0.15)' }, lineStyle: { color: PALETTE.success, width: 1.5, type: 'dashed' }, itemStyle: { color: PALETTE.success } },
      ],
    }],
  }), []);

  // 5. 调节收益构成饼图
  const revenueOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'item', formatter: '{b}: ¥{c}/日 ({d}%)' },
    legend: { orient: 'vertical', right: 4, top: 'middle', textStyle: { color: PALETTE.textMid, fontSize: 10 }, itemWidth: 8, itemHeight: 8 },
    series: [{
      type: 'pie', radius: ['48%', '72%'], center: ['35%', '50%'],
      itemStyle: { borderColor: '#02070f', borderWidth: 2 },
      label: { color: PALETTE.textMain, fontSize: 10, fontFamily: 'Orbitron', formatter: '¥{c}' },
      data: [
        { value: 186, name: 'I段削峰', itemStyle: { color: PALETTE.primary } },
        { value: 124, name: 'II段填谷', itemStyle: { color: PALETTE.cyanGlow } },
        { value: 92, name: 'III段调频', itemStyle: { color: PALETTE.warn } },
        { value: 245, name: '光伏消纳', itemStyle: { color: '#ff8844' } },
        { value: 86, name: '需求响应补贴', itemStyle: { color: PALETTE.success } },
      ],
    }],
  }), []);

  // 6. 各时段调节潜力热力图（24h × 4 母线）
  const heatmapOption = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i + ':00');
    const data: any[] = [];
    BUSES.forEach((bus, bi) => {
      hours.forEach((_, hi) => {
        const potential = (bus.controllable / bus.cap) * 100 * (0.5 + 0.5 * Math.sin((hi - 6) / 24 * Math.PI * 2));
        data.push([hi, bi, +potential.toFixed(1)]);
      });
    });
    return {
      tooltip: { ...commonTooltip, formatter: (p: any) => `${BUSES[p.data[1]].name} ${hours[p.data[0]]}<br/>调节潜力: <b style="color:${PALETTE.success}">${p.data[2]}%</b>` },
      grid: { ...commonGrid, left: 60, right: 16, top: 14, bottom: 24 },
      xAxis: { type: 'category', data: hours, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9, interval: 3 } },
      yAxis: { type: 'category', data: BUSES.map(b => b.name), ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 10 } },
      visualMap: {
        min: 0, max: 60,
        calculable: true, orient: 'horizontal', left: 'center', bottom: 0,
        textStyle: { color: PALETTE.textMid, fontSize: 9 },
        inRange: { color: ['#0a1f3d', '#1a4a7a', PALETTE.primary, PALETTE.cyanGlow, PALETTE.success] },
        itemWidth: 12, itemHeight: 80,
      },
      series: [{
        type: 'heatmap', data,
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: PALETTE.primary } },
      }],
    };
  }, []);

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40, overflow: 'hidden' }}>
      {/* 顶部 KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
        {[
          { label: '当前总负荷', value: totalLoad.toFixed(1), unit: 'kW', sub: `容量 ${totalCapacity} kW · 负载率 ${loadRate}%`, color: PALETTE.warn, icon: '⚡' },
          { label: '可控负荷', value: totalControllable.toFixed(1), unit: 'kW', sub: `占比 ${controllableRate}%`, color: PALETTE.success, icon: '🎛' },
          { label: '不可控负荷', value: (totalLoad - totalControllable).toFixed(1), unit: 'kW', sub: '动力/其他', color: PALETTE.textDim, icon: '🔒' },
          { label: '快调容量', value: BUSES.reduce((s, b) => s + b.fast, 0).toFixed(1), unit: 'kW', sub: '< 5 分钟响应', color: PALETTE.primary, icon: '⚡' },
          { label: '慢调容量', value: BUSES.reduce((s, b) => s + b.slow, 0).toFixed(1), unit: 'kW', sub: '5~30 分钟响应', color: PALETTE.cyanGlow, icon: '⏱' },
          { label: '调节日收益', value: totalRevenue.toString(), unit: '元', sub: '削峰填谷+补贴', color: PALETTE.warn, icon: '💰' },
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
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px', minHeight: 0 }}>
        {/* 左：母线负载与可调容量堆叠 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>📊 各母线负载与可调容量构成 (kW)</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={busBarOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
        {/* 右：24h 负荷曲线 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>📈 24h 负荷曲线 + 可调容量 (kW)</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={dailyOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
      </div>

      {/* 底部：负荷类型 + 调节策略 + 收益 + 热力图 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.4fr', gap: '10px', minHeight: '180px' }}>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>⚙ 各负荷类型可控占比</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={loadTypeOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>🎯 需求响应策略能力</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={strategyOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>💰 调节收益构成</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={revenueOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>🔥 24h × 4母线 调节潜力热力图 (%)</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={heatmapOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
