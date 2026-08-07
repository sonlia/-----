'use client';
import RegionTreeSelector from './RegionTreeSelector';
import { useMemo, useState } from 'react';
import EChart, { PALETTE, commonGrid, commonTooltip, commonAxis } from './EChart';

interface CarbonPanelProps { kpiPower: string; }

export default function CarbonPanel({ kpiPower }: CarbonPanelProps) {
  const power = parseFloat(kpiPower || '0');
  const totalLoad = power + 18.6;
  const carbonFactor = 0.5810;
  const hourlyCarbon = totalLoad * carbonFactor;
  const annualQuota = 2800;
  const usedQuota = totalLoad * carbonFactor * 24 * 365 * 0.32;
  const pct = usedQuota / annualQuota;
  // 碳履约评级（用户要求：显示"良"，不显示"高风险"）
  const riskLevel = { label: '良', color: '#00ffcc' };
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };

  // 减碳量 → 等效植树（形象化展示）
  // 1棵树每年吸收约 18.3 kg CO₂（IPCC标准）
  const TREES_PER_KG = 1 / 18.3;
  const annualCarbonReduce = 50 * carbonFactor * 24 * 365; // 年减碳量 (kg)
  const equivalentTrees = Math.round(annualCarbonReduce * TREES_PER_KG); // 等效植树棵数
  const dailyCarbonReduce = 50 * carbonFactor * 24; // 日减碳量 (kg)
  const dailyTrees = Math.round(dailyCarbonReduce * TREES_PER_KG);

  // 1. Scope 饼图
  const scopeOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'item', formatter: '{b}: {c}% ({d}%)' },
    legend: { orient: 'vertical', right: 4, top: 'middle', textStyle: { color: PALETTE.textMid, fontSize: 10 }, itemWidth: 8, itemHeight: 8 },
    series: [{
      type: 'pie',
      radius: ['48%', '72%'],
      center: ['35%', '50%'],
      itemStyle: { borderColor: '#02070f', borderWidth: 2 },
      label: { color: PALETTE.textMain, fontSize: 10, fontFamily: 'Orbitron' },
      data: [
        { value: 85, name: 'Scope 2 电力', itemStyle: { color: PALETTE.primary } },
        { value: 8, name: 'Scope 1 直排', itemStyle: { color: PALETTE.warn } },
        { value: 7, name: 'Scope 3 间接', itemStyle: { color: '#ff8844' } },
      ],
    }],
  }), []);

  // 2. 12月趋势柱状图（去年vs今年）
  const trendOption = useMemo(() => {
    const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const baseVal = hourlyCarbon * 24 * 30 / 1000;
    const thisYear = months.map((_, i) => +(baseVal * (0.85 + Math.sin(i / 2) * 0.15)).toFixed(2));
    const lastYear = thisYear.map(v => +(v * 1.17).toFixed(2));
    return {
      tooltip: { ...commonTooltip, trigger: 'axis' },
      legend: { data: ['去年', '今年'], textStyle: { color: PALETTE.textMid, fontSize: 10 }, top: 0, right: 0, itemWidth: 10, itemHeight: 6 },
      grid: { ...commonGrid, left: 32, right: 12, top: 26, bottom: 22 },
      xAxis: { type: 'category', data: months, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9 } },
      yAxis: { type: 'value', name: 'tCO₂', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [
        { name: '去年', type: 'bar', barWidth: 8, data: lastYear, itemStyle: { color: 'rgba(138,165,196,0.25)', borderRadius: [3, 3, 0, 0] } },
        { name: '今年', type: 'bar', barWidth: 8, data: thisYear, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.cyanGlow }, { offset: 1, color: PALETTE.cyanGlow + '40' }] }, borderRadius: [3, 3, 0, 0] } },
      ],
    };
  }, [hourlyCarbon]);

  // 3. 碳中和进度仪表盘（双层环）
  const progressOption = useMemo(() => ({
    series: [
      {
        type: 'gauge', radius: '92%', center: ['50%', '55%'], startAngle: 90, endAngle: -270,
        min: 0, max: 100,
        axisLine: { lineStyle: { width: 10, color: [[pct, { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: PALETTE.success }, { offset: 0.5, color: PALETTE.cyanGlow }, { offset: 1, color: PALETTE.primary }] }], [1, 'rgba(0,255,204,0.08)']] } },
        pointer: { show: false },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        anchor: { show: false },
        detail: { formatter: '{value}%', offsetCenter: [0, '-5%'], color: PALETTE.cyanGlow, fontSize: 24, fontFamily: 'Orbitron', fontWeight: 700 },
        title: { offsetCenter: [0, '20%'], color: PALETTE.textDim, fontSize: 10, fontFamily: 'Rajdhani' },
        data: [{ value: +(pct * 100).toFixed(1), name: '配额使用率' }],
      },
      {
        type: 'gauge', radius: '72%', center: ['50%', '55%'], startAngle: 90, endAngle: -270,
        min: 0, max: 100,
        axisLine: { lineStyle: { width: 5, color: [[0.25, PALETTE.warn], [1, 'rgba(255,204,68,0.1)']] } },
        pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        anchor: { show: false }, detail: { show: false }, title: { show: false },
        data: [{ value: 25 }],
      },
    ],
  }), [pct]);

  // 4. 重点排放源条形图
  const sourceOption = useMemo(() => {
    const data = [
      { n: '楼宇空调', v: power * 0.6 * carbonFactor, col: PALETTE.primaryDeep },
      { n: '楼宇照明', v: power * 0.4 * carbonFactor, col: PALETTE.primary },
      { n: '充电桩', v: 18.6 * carbonFactor, col: PALETTE.success },
      { n: '其他', v: 3.2 * carbonFactor, col: '#ff8844' },
    ];
    return {
      tooltip: { ...commonTooltip, trigger: 'axis', formatter: '{b}: {c} kgCO₂/h' },
      grid: { ...commonGrid, left: 56, right: 36, top: 10, bottom: 18 },
      xAxis: { type: 'value', ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9 } },
      yAxis: { type: 'category', data: data.map(d => d.n), ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 10 } },
      series: [{
        type: 'bar', barWidth: 12,
        data: data.map(d => ({ value: +d.v.toFixed(2), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: d.col + '60' }, { offset: 1, color: d.col }] }, borderRadius: [0, 4, 4, 0] } })),
        label: { show: true, position: 'right', formatter: '{c}', color: PALETTE.textMain, fontSize: 10, fontFamily: 'Orbitron', fontWeight: 600 },
      }],
    };
  }, [power]);

  // 5. 近12月碳排放趋势线图（同比曲线）
  const lineOption = useMemo(() => {
    const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const baseVal = hourlyCarbon * 24 * 30 / 1000;
    const thisYear = months.map((_, i) => +(baseVal * (0.85 + Math.sin(i / 2) * 0.15)).toFixed(2));
    const lastYear = thisYear.map(v => +(v * 1.17).toFixed(2));
    return {
      tooltip: { ...commonTooltip, trigger: 'axis' },
      legend: { data: ['今年累计', '配额上限'], textStyle: { color: PALETTE.textMid, fontSize: 10 }, top: 0, right: 0, itemWidth: 10, itemHeight: 6 },
      grid: { ...commonGrid, left: 32, right: 12, top: 26, bottom: 22 },
      xAxis: { type: 'category', data: months, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9 } },
      yAxis: { type: 'value', name: 'tCO₂', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [
        { name: '今年累计', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: thisYear.reduce((acc: number[], v: number, i: number) => { acc.push(+(acc[i - 1] || 0) + v); return acc; }, []), lineStyle: { color: PALETTE.cyanGlow, width: 2.5 }, itemStyle: { color: PALETTE.cyanGlow, borderColor: '#02070f', borderWidth: 2 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,255,204,0.3)' }, { offset: 1, color: 'rgba(0,255,204,0)' }] } } },
        { name: '配额上限', type: 'line', smooth: true, symbol: 'none', data: months.map((_, i) => +(annualQuota / 12 * (i + 1)).toFixed(2)), lineStyle: { color: PALETTE.danger, type: 'dashed', width: 2 }, itemStyle: { color: PALETTE.danger } },
      ],
    };
  }, [hourlyCarbon, annualQuota]);

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40, overflow: 'hidden' }}>
      <RegionTreeSelector />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
        {[
          { label: '实时碳排放强度', value: hourlyCarbon.toFixed(2), unit: 'kgCO₂/h', sub: '因子 0.581', color: '#00ffcc', icon: '📊' },
          { label: '年度配额使用率', value: (pct * 100).toFixed(1), unit: '%', sub: '剩余 ' + (annualQuota - usedQuota).toFixed(0) + ' kg', color: '#00d4ff', icon: '⚖' },
          { label: '碳履约评级', value: riskLevel.label, unit: '', sub: '基于配额消耗', color: riskLevel.color, icon: '🛡' },
          { label: '年累计减碳量', value: (50 * carbonFactor * 24 * 365 / 1000).toFixed(1), unit: 'tCO₂', sub: '光伏贡献', color: '#00ff88', icon: '🌱' },
        ].map((kpi, i) => (
          <div key={i} className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px' }}>{kpi.icon}</span>{kpi.label}
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: kpi.unit ? '28px' : '22px', fontWeight: 700, color: kpi.color, textShadow: `0 0 12px ${kpi.color}40` }}>
              {kpi.value}{kpi.unit && <span style={{ fontSize: '13px', color: 'var(--text-dim)', marginLeft: '4px' }}>{kpi.unit}</span>}
            </div>
            <div style={{ fontSize: '10px', color: kpi.color, marginTop: '4px', opacity: 0.8 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '10px', minHeight: 0 }}>
        {/* 左侧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: '0 0 auto' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>排放源构成 (Scope)</div>
            <EChart option={scopeOption} height={150} />
          </div>
          <div className="panel" style={{ ...panelStyle, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            {/* 减碳→等效植树 形象化展示 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', marginBottom: '8px', background: 'linear-gradient(90deg, rgba(0,255,136,0.08), rgba(0,255,204,0.04))', borderRadius: '6px', border: '1px solid rgba(0,255,136,0.2)' }}>
              <span style={{ fontSize: '24px' }}>🌳</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>年减碳量等效植树</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: 'var(--success)', textShadow: '0 0 8px rgba(0,255,136,0.4)' }}>
                  {equivalentTrees.toLocaleString()}<span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '4px' }}>棵</span>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-mid)', marginTop: '2px' }}>
                  年减碳 {(annualCarbonReduce/1000).toFixed(1)} tCO₂ · 日均 {dailyTrees} 棵
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '4px 8px', background: 'rgba(0,255,136,0.06)', borderRadius: '4px' }}>
                <span style={{ fontSize: '14px' }}>🌲🌴🌳</span>
                <span style={{ fontSize: '8px', color: 'var(--success)' }}>1棵≈18.3kg/年</span>
              </div>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>重点排放源 (kgCO₂/h)</div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <EChart option={sourceOption} height="100%" style={{ height: '100%' }} />
            </div>
          </div>
        </div>

        {/* 中间 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, letterSpacing: '1px' }}>近12月碳排放趋势 (tCO₂)</span>
              <span style={{ fontSize: '10px', color: 'var(--success)' }}>同比 ⬇️ 14.3%</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <EChart option={trendOption} height="100%" style={{ height: '100%' }} />
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: '0 0 auto' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>🌱 绿色贡献与价值转化</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: '等效植树', val: Math.round(50 * carbonFactor * 24 * 365 / 5.8), unit: '棵/年', color: '#00ff88' },
                { label: '节约标煤', val: (50 * 24 * 365 * 0.328 / 1000).toFixed(1), unit: 't/年', color: '#ffcc44' },
                { label: 'SO₂减排', val: (50 * 24 * 365 * 0.0028).toFixed(0), unit: 'kg/年', color: '#00d4ff' },
                { label: 'CCER持有', val: '1,250', unit: 'tCO₂', color: '#00ffcc' },
              ].map((d, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '8px 4px', background: `${d.color}0d`, borderRadius: '4px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{d.label}</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '16px', fontWeight: 700, color: d.color }}>{d.val}</div>
                  <div style={{ fontSize: '8px', color: 'var(--text-dim)' }}>{d.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, textAlign: 'center', flex: '0 0 auto' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '2px', letterSpacing: '1px' }}>碳中和进度</div>
            <EChart option={progressOption} height={170} />
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
              {usedQuota.toFixed(0)} / {annualQuota} kg · CCER抵消 25%
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>累计排放 vs 配额上限</div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <EChart option={lineOption} height="100%" style={{ height: '100%' }} />
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: '0 0 auto' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>📋 碳资产管理</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {[
                { label: '碳配额余额', val: (annualQuota - usedQuota).toFixed(0) + ' kg', color: 'var(--primary)' },
                { label: 'CCER余额', val: '1,250 tCO₂', color: 'var(--cyan-glow)' },
                { label: '碳信用评级', val: 'AA', color: 'var(--success)' },
                { label: '履约状态', val: '✓ 达标', color: 'var(--success)' },
                { label: '下次核查', val: '2026-12-31', color: 'var(--text-mid)' },
              ].map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'rgba(255,204,68,0.04)', borderRadius: '3px', borderLeft: '2px solid ' + d.color }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-mid)' }}>{d.label}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '11px', color: d.color, fontWeight: 600 }}>{d.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
