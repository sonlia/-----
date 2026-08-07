'use client';
import ModuleSelector from './ModuleSelector';
import { useMemo, useState } from 'react';
import EChart, { PALETTE, commonGrid, commonTooltip, commonAxis } from './EChart';

interface SolarPanelProps { kpiPower: string; }

export default function SolarPanel({ kpiPower }: SolarPanelProps) {
  const [selTime, setSelTime] = useState('今日');
  const [selZone, setSelZone] = useState('全部区域');
  const pvOutput = 32.5;
  const pvCapacity = 50;
  const pvSelfRate = ((pvOutput / (pvOutput + 18.6 + parseFloat(kpiPower || '0'))) * 100).toFixed(1);
  const dailyGen = pvOutput * 8;
  const carbonReduce = pvOutput * 0.5810;
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };

  // 1. 24h 发电功率趋势（面积+峰值标记）
  const trendOption = useMemo(() => {
    const hours = Array.from({ length: 25 }, (_, i) => i + ':00');
    const data = hours.map((_, i) => {
      if (i < 6 || i > 18) return 0;
      const t = (i - 6) / 12;
      return Math.sin(t * Math.PI) * 48 * (0.95 + Math.sin(i) * 0.05);
    });
    return {
      tooltip: { ...commonTooltip, trigger: 'axis', formatter: (p: any) => `${p[0].name}:00<br/>功率: <b style="color:${PALETTE.success}">${p[0].value.toFixed(1)} kW</b>` },
      grid: { ...commonGrid, left: 36, right: 16, top: 18, bottom: 24 },
      xAxis: { type: 'category', data: hours, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, interval: 4 } },
      yAxis: { type: 'value', name: 'kW', max: 60, ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [{
        type: 'line', smooth: true, symbol: 'none', data,
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,255,136,0.55)' }, { offset: 1, color: 'rgba(0,255,136,0)' }] } },
        lineStyle: { color: PALETTE.success, width: 2.5, shadowColor: PALETTE.success, shadowBlur: 8 },
        markPoint: {
          symbol: 'pin', symbolSize: 36,
          data: [
            { name: '峰值', coord: ['12', 48.2], value: '48.2kW', itemStyle: { color: PALETTE.warn }, label: { color: '#fff', fontSize: 9, fontFamily: 'Orbitron' } },
            { name: '当前', coord: ['16', pvOutput], value: pvOutput + 'kW', itemStyle: { color: PALETTE.cyanGlow }, label: { color: '#02070f', fontSize: 9, fontFamily: 'Orbitron' } },
          ],
        },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: PALETTE.warn, type: 'dashed', opacity: 0.4 }, data: [{ yAxis: 48.2, label: { formatter: '峰值', color: PALETTE.warn, fontSize: 9 } }] },
      }],
    };
  }, [pvOutput]);

  // 2. 逆变器效率仪表盘
  const gaugeOption = useMemo(() => ({
    series: [{
      type: 'gauge', radius: '95%', center: ['50%', '60%'],
      startAngle: 210, endAngle: -30,
      min: 0, max: 100,
      progress: { show: true, width: 10, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: PALETTE.success }, { offset: 1, color: PALETTE.cyanGlow }] } } },
      axisLine: { lineStyle: { width: 10, color: [[1, 'rgba(0,255,136,0.1)']] } },
      axisTick: { distance: -16, length: 4, lineStyle: { color: 'rgba(138,165,196,0.4)' } },
      splitLine: { distance: -16, length: 8, lineStyle: { color: 'rgba(138,165,196,0.5)' } },
      axisLabel: { distance: -22, color: PALETTE.textDim, fontSize: 8 },
      pointer: { width: 3, length: '60%', itemStyle: { color: PALETTE.success } },
      anchor: { show: true, size: 8, itemStyle: { color: PALETTE.success } },
      title: { show: false },
      detail: { valueAnimation: true, offsetCenter: [0, '20%'], formatter: '{value}%', color: PALETTE.success, fontSize: 22, fontFamily: 'Orbitron', fontWeight: 700 },
      data: [{ value: 96.2 }],
    }],
  }), []);

  // 3. 资产健康三环（多仪表盘叠加）
  const healthOption = useMemo(() => ({
    series: [
      { type: 'gauge', radius: '90%', center: ['50%', '55%'], startAngle: 90, endAngle: -270, min: 0, max: 100, splitNumber: 0, axisLine: { lineStyle: { width: 6, color: [[0.962, PALETTE.success], [1, 'rgba(0,255,136,0.1)']] } }, pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, detail: { show: false }, data: [{ value: 96.2 }] },
      { type: 'gauge', radius: '70%', center: ['50%', '55%'], startAngle: 90, endAngle: -270, min: 0, max: 100, splitNumber: 0, axisLine: { lineStyle: { width: 5, color: [[0.88, PALETTE.primary], [1, 'rgba(0,212,255,0.1)']] } }, pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, detail: { show: false }, data: [{ value: 88 }] },
      { type: 'gauge', radius: '50%', center: ['50%', '55%'], startAngle: 90, endAngle: -270, min: 0, max: 100, splitNumber: 0, axisLine: { lineStyle: { width: 4, color: [[1.0, PALETTE.warn], [1, 'rgba(255,204,68,0.1)']] } }, pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, detail: { formatter: '{value}%', color: PALETTE.success, fontSize: 18, fontFamily: 'Orbitron', fontWeight: 700, offsetCenter: [0, '5%'] }, data: [{ value: 96.2 }] },
    ],
  }), []);

  // 4. 度电成本对比柱状图
  const costOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'axis', formatter: '{b}: {c} 分/kWh' },
    grid: { ...commonGrid, left: 32, right: 12, top: 16, bottom: 22 },
    xAxis: { type: 'category', data: ['电网购电', '光伏自用', '储能放电'], ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9 } },
    yAxis: { type: 'value', name: '分', max: 100, ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
    series: [{
      type: 'bar', barWidth: 22,
      data: [
        { value: 78, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.primaryDeep }, { offset: 1, color: PALETTE.primaryDeep + '40' }] }, borderRadius: [4, 4, 0, 0] } },
        { value: 52, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.success }, { offset: 1, color: PALETTE.success + '40' }] }, borderRadius: [4, 4, 0, 0] } },
        { value: 61, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.warn }, { offset: 1, color: PALETTE.warn + '40' }] }, borderRadius: [4, 4, 0, 0] } },
      ],
      label: { show: true, position: 'top', formatter: '{c}分', color: PALETTE.textMain, fontSize: 11, fontFamily: 'Orbitron', fontWeight: 700 },
      markLine: { symbol: 'none', lineStyle: { color: PALETTE.success, type: 'dashed' }, data: [{ yAxis: 52, label: { formatter: '光伏成本', color: PALETTE.success, fontSize: 9 } }] },
    }],
  }), []);

  // 5. 各区域辐照度水平条形图
  const irrOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'axis', formatter: '{b}: {c} W/m²' },
    grid: { ...commonGrid, left: 56, right: 36, top: 10, bottom: 18 },
    xAxis: { type: 'value', max: 1000, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9 } },
    yAxis: { type: 'category', data: ['屋顶东侧', '屋顶西侧', '车棚', '地面'], ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 10 } },
    series: [{
      type: 'bar', barWidth: 12,
      data: [
        { value: 820, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: PALETTE.warn + '60' }, { offset: 1, color: PALETTE.warn }] }, borderRadius: [0, 4, 4, 0] } },
        { value: 780, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#ffaa4460' }, { offset: 1, color: '#ffaa44' }] }, borderRadius: [0, 4, 4, 0] } },
        { value: 650, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#ff884460' }, { offset: 1, color: '#ff8844' }] }, borderRadius: [0, 4, 4, 0] } },
        { value: 590, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#ff664460' }, { offset: 1, color: '#ff6644' }] }, borderRadius: [0, 4, 4, 0] } },
      ],
      label: { show: true, position: 'right', formatter: '{c} W/m²', color: PALETTE.textMain, fontSize: 10, fontFamily: 'Orbitron', fontWeight: 600 },
    }],
  }), []);

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40, overflow: 'hidden' }}>
      <ModuleSelector selectors={[{ label: '时间维度', options: ['今日', '本周', '本月', '本年'], value: selTime, onChange: setSelTime }, { label: '区域', options: ['全部区域', '1F大厅', '2F办公区', '3F会议区', '4F机房', '5F餐厅'], value: selZone, onChange: setSelZone }]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
        {[
          { label: '今日发电量', value: dailyGen.toFixed(0), unit: 'kWh', sub: '理论最大 400kWh', color: '#00ff88', icon: '☀' },
          { label: '累计等效减碳量', value: (pvOutput * 0.5810 * 24 * 365 / 1000).toFixed(1), unit: 'tCO₂', sub: '年累计', color: '#00ffcc', icon: '🌱' },
          { label: '系统综合效率', value: '96.2', unit: '%', sub: 'PR值 优于行业', color: '#00d4ff', icon: '⚙' },
          { label: '自发自用比例', value: pvSelfRate, unit: '%', sub: '消纳率', color: '#ffcc44', icon: '📊' },
        ].map((kpi, i) => (
          <div key={i} className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px' }}>{kpi.icon}</span>{kpi.label}
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '30px', fontWeight: 700, color: kpi.color, textShadow: `0 0 12px ${kpi.color}40` }}>
              {kpi.value}<span style={{ fontSize: '13px', color: 'var(--text-dim)', marginLeft: '4px' }}>{kpi.unit}</span>
            </div>
            <div style={{ fontSize: '10px', color: kpi.color, marginTop: '4px', opacity: 0.8 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: '10px', minHeight: 0 }}>
        {/* 左侧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, textAlign: 'center', flex: '0 0 auto' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '2px', letterSpacing: '1px' }}>资产健康度（三环）</div>
            <EChart option={healthOption} height={160} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginTop: '4px', fontSize: '9px' }}>
              <div style={{ color: PALETTE.success }}>● 效率 96.2%</div>
              <div style={{ color: PALETTE.primary }}>● 清洁 88%</div>
              <div style={{ color: PALETTE.warn }}>● 在线 100%</div>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>故障预警分布</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', overflowY: 'auto' }}>
              {[
                { zone: '屋顶东侧', issue: '面板积灰', level: 'warn', pct: '12%' },
                { zone: '屋顶西侧', issue: '正常', level: 'ok', pct: '0%' },
                { zone: '车棚', issue: '微裂纹预警', level: 'danger', pct: '3片' },
                { zone: '地面', issue: '正常', level: 'ok', pct: '0%' },
              ].map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', padding: '5px 8px', background: d.level === 'danger' ? 'rgba(255,77,109,0.06)' : d.level === 'warn' ? 'rgba(255,170,68,0.06)' : 'rgba(0,255,136,0.04)', borderRadius: '3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: d.level === 'danger' ? 'var(--danger)' : d.level === 'warn' ? 'var(--warn)' : 'var(--success)' }}></span>
                  <span style={{ color: 'var(--text-main)', minWidth: '60px' }}>{d.zone}</span>
                  <span style={{ color: 'var(--text-mid)', flex: 1 }}>{d.issue}</span>
                  <span style={{ color: d.level === 'danger' ? 'var(--danger)' : d.level === 'warn' ? 'var(--warn)' : 'var(--success)', fontFamily: 'Orbitron, monospace' }}>{d.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 中间 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>24小时发电功率趋势</div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <EChart option={trendOption} height="100%" style={{ height: '100%' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
              <span>当前 <span style={{ color: 'var(--success)', fontFamily: 'Orbitron, monospace' }}>{pvOutput} kW</span></span>
              <span>峰值 <span style={{ color: 'var(--warn)', fontFamily: 'Orbitron, monospace' }}>48.2 kW</span></span>
              <span>日照 <span style={{ color: 'var(--primary)', fontFamily: 'Orbitron, monospace' }}>8.2h</span></span>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: '0 0 auto' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>☀ 各区域辐照度</div>
            <EChart option={irrOption} height={140} />
          </div>
        </div>

        {/* 右侧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, textAlign: 'center', flex: '0 0 auto' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '2px', letterSpacing: '1px' }}>逆变器效率</div>
            <EChart option={gaugeOption} height={150} />
          </div>
          <div className="panel" style={{ ...panelStyle, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>度电成本对比</div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <EChart option={costOption} height="100%" style={{ height: '100%' }} />
            </div>
            <div style={{ marginTop: '4px', padding: '6px', background: 'rgba(0,255,136,0.06)', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>年成本节约指数</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: 'var(--success)', textShadow: '0 0 10px rgba(0,255,136,0.4)' }}>+33.3%</div>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: '0 0 auto' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>🌱 环保价值</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                { label: '等效植树', val: Math.round(carbonReduce * 24 / 5.8), unit: '棵/日', color: '#00ffcc' },
                { label: '节约标煤', val: (dailyGen * 0.328).toFixed(1), unit: 'kg/日', color: '#00ff88' },
                { label: 'SO₂减排', val: (dailyGen * 0.0028).toFixed(2), unit: 'kg/日', color: '#00d4ff' },
                { label: 'NOx减排', val: (dailyGen * 0.0015).toFixed(2), unit: 'kg/日', color: '#ffcc44' },
              ].map((d, i) => (
                <div key={i} style={{ padding: '6px', background: `${d.color}0d`, borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{d.label}</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', color: d.color, fontWeight: 700 }}>{d.val}</div>
                  <div style={{ fontSize: '8px', color: 'var(--text-dim)' }}>{d.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
