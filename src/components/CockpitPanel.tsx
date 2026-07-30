'use client';
import { useEffect, useRef, useMemo } from 'react';
import EChart, { PALETTE, commonGrid, commonTooltip, commonAxis } from './EChart';

interface CockpitPanelProps { kpiPower: string; lightingOn: boolean; acOn: boolean; }

function setupHiDPI(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = '100%'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d')!; ctx.scale(dpr, dpr);
  return ctx;
}

// 子系统卡片：现状/问题/价值 三维度
interface SubsystemCardProps {
  title: string;
  icon: string;
  accent: string;
  status: { label: string; value: string; unit?: string };
  problem: { label: string; level: 'ok' | 'warn' | 'danger' };
  value: { label: string; delta: string; trend: 'up' | 'down' };
  spark: number[];
}

function SubsystemCard({ title, icon, accent, status, problem, value, spark }: SubsystemCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const W = 120, H = 28, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const mx = Math.max(...spark), mn = Math.min(...spark);
    const range = mx - mn || 1;
    // 渐变填充
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, accent + '60'); grad.addColorStop(1, accent + '00');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(0, H);
    spark.forEach((v, i) => { const x = i / (spark.length - 1) * W; const y = H - (v - mn) / range * (H - 4) - 2; ctx.lineTo(x, y); });
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // 折线
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.shadowColor = accent; ctx.shadowBlur = 3;
    ctx.beginPath();
    spark.forEach((v, i) => { const x = i / (spark.length - 1) * W; const y = H - (v - mn) / range * (H - 4) - 2; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.stroke();
  }, [spark, accent]);

  const problemColor = problem.level === 'ok' ? PALETTE.success : problem.level === 'warn' ? PALETTE.warn : PALETTE.danger;
  const problemIcon = problem.level === 'ok' ? '✓' : problem.level === 'warn' ? '⚠' : '✗';

  return (
    <div className="panel" style={{ position: 'relative', padding: '10px 12px', borderLeft: `3px solid ${accent}` }}>
      <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span style={{ fontSize: '15px' }}>{icon}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, letterSpacing: '1px' }}>{title}</span>
      </div>
      {/* 现状 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: accent, textShadow: `0 0 8px ${accent}60` }}>{status.value}</span>
        {status.unit && <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{status.unit}</span>}
        <span style={{ fontSize: '9px', color: 'var(--text-dim)', marginLeft: 'auto' }}>{status.label}</span>
      </div>
      {/* spark */}
      <canvas ref={canvasRef} width={120} height={28} style={{ width: '100%', height: '28px', marginBottom: '6px' }}></canvas>
      {/* 问题 + 价值 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px' }}>
        <div style={{ padding: '4px 6px', background: `${problemColor}10`, borderRadius: '3px', borderLeft: `2px solid ${problemColor}` }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '9px' }}>风险预警</div>
          <div style={{ color: problemColor, fontWeight: 600, fontSize: '10px' }}><span>{problemIcon}</span> {problem.label}</div>
        </div>
        <div style={{ padding: '4px 6px', background: `${PALETTE.success}10`, borderRadius: '3px', borderLeft: `2px solid ${PALETTE.success}` }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '9px' }}>{value.label}</div>
          <div style={{ color: PALETTE.success, fontWeight: 600, fontSize: '10px' }}>{value.trend === 'up' ? '↑' : '↓'} {value.delta}</div>
        </div>
      </div>
    </div>
  );
}

export default function CockpitPanel({ kpiPower, lightingOn, acOn }: CockpitPanelProps) {
  const power = parseFloat(kpiPower || '0');
  const totalLoad = power + 18.6;
  const pvOutput = 32.5;
  const gridPower = Math.max(0, totalLoad - pvOutput);
  const pvSelfRate = pvOutput > 0 ? (Math.min(pvOutput, totalLoad * 0.3) / pvOutput * 100) : 0;
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };

  // === ECharts 配置 ===

  // 1. 多源能源构成 - 桑基/流向图
  const energyFlowOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'item' },
    series: [{
      type: 'sankey',
      left: 8, right: 80, top: 12, bottom: 12,
      nodeWidth: 6, nodeGap: 6,
      data: [
        { name: '电网', itemStyle: { color: PALETTE.primaryDeep } },
        { name: '光伏', itemStyle: { color: PALETTE.warn } },
        { name: '储能', itemStyle: { color: PALETTE.cyanGlow } },
        { name: '楼宇', itemStyle: { color: PALETTE.primary } },
        { name: '充电桩', itemStyle: { color: PALETTE.success } },
        { name: '空调', itemStyle: { color: PALETTE.danger } },
        { name: '照明', itemStyle: { color: '#ffcc44' } },
      ],
      links: [
        { source: '电网', target: '楼宇', value: gridPower * 0.4 },
        { source: '电网', target: '充电桩', value: gridPower * 0.35 },
        { source: '电网', target: '空调', value: gridPower * 0.25 },
        { source: '光伏', target: '楼宇', value: pvOutput * 0.5 },
        { source: '光伏', target: '空调', value: pvOutput * 0.3 },
        { source: '光伏', target: '照明', value: pvOutput * 0.2 },
        { source: '储能', target: '充电桩', value: 8.5 },
        { source: '储能', target: '楼宇', value: 4.2 },
      ],
      lineStyle: { color: 'gradient', opacity: 0.5, curveness: 0.5 },
      label: { color: PALETTE.textMain, fontSize: 10, fontFamily: 'Rajdhani' },
    }],
  }), [gridPower, pvOutput]);

  // 2. 24h 多源负荷趋势堆叠面积图
  const trendOption = useMemo(() => {
    const hours = Array.from({ length: 25 }, (_, i) => i + ':00');
    const grid = hours.map((_, i) => {
      const base = gridPower * (0.4 + 0.6 * Math.sin((i - 6) / 24 * Math.PI * 2 + Math.PI / 2));
      return Math.max(0, base);
    });
    const pv = hours.map((_, i) => {
      if (i < 6 || i > 18) return 0;
      const t = (i - 6) / 12;
      return Math.sin(t * Math.PI) * pvOutput;
    });
    const storage = hours.map((_, i) => 5 + 4 * Math.sin(i / 4));
    return {
      tooltip: { ...commonTooltip, trigger: 'axis' },
      legend: {
        data: ['电网', '光伏', '储能'],
        textStyle: { color: PALETTE.textMid, fontSize: 10 },
        top: 0, right: 0, itemWidth: 10, itemHeight: 6,
      },
      grid: { ...commonGrid, left: 36, right: 12, top: 26, bottom: 22 },
      xAxis: { type: 'category', data: hours, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, interval: 5 } },
      yAxis: { type: 'value', name: 'kW', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [
        { name: '电网', type: 'line', stack: 'a', areaStyle: { opacity: 0.6, color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.primaryDeep }, { offset: 1, color: PALETTE.primaryDeep + '20' }] } }, lineStyle: { color: PALETTE.primaryDeep, width: 1 }, symbol: 'none', data: grid },
        { name: '光伏', type: 'line', stack: 'a', areaStyle: { opacity: 0.6, color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.warn }, { offset: 1, color: PALETTE.warn + '20' }] } }, lineStyle: { color: PALETTE.warn, width: 1 }, symbol: 'none', data: pv },
        { name: '储能', type: 'line', stack: 'a', areaStyle: { opacity: 0.6, color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.cyanGlow }, { offset: 1, color: PALETTE.cyanGlow + '20' }] } }, lineStyle: { color: PALETTE.cyanGlow, width: 1 }, symbol: 'none', data: storage },
      ],
    };
  }, [gridPower, pvOutput]);

  // 3. 风险预警矩阵 - 散点图
  const riskMatrixOption = useMemo(() => ({
    tooltip: { ...commonTooltip, formatter: (p: any) => `${p.data[3]}<br/>概率: ${p.data[0]}<br/>影响: ${p.data[1]}` },
    grid: { left: 36, right: 12, top: 14, bottom: 28 },
    xAxis: { type: 'value', min: 0, max: 100, name: '发生概率', nameLocation: 'middle', nameGap: 18, ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 }, splitLine: { show: false } },
    yAxis: { type: 'value', min: 0, max: 100, name: '影响程度', nameLocation: 'middle', nameGap: 24, ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 }, splitLine: { show: false } },
    visualMap: {
      type: 'piecewise',
      dimension: 2,
      pieces: [
        { gte: 70, color: PALETTE.danger },          // 高风险红
        { gte: 30, lt: 70, color: PALETTE.warn },    // 中风险黄
        { lt: 30, color: PALETTE.success },          // 低风险绿
      ],
      show: false,
    },
    series: [{
      type: 'scatter',
      symbolSize: (data: any) => 10 + data[2] / 8,
      data: [
        [65, 80, 80, '配网过载'], [40, 60, 50, '光伏降功率'],
        [25, 70, 30, '充电桩故障'], [55, 75, 65, '空调启停冲击'],
        [20, 40, 20, '楼宇照明掉线'], [70, 55, 60, '储能SOC过低'],
        [30, 30, 20, '通信延迟'], [50, 50, 40, '需量越限'],
      ],
      label: { show: true, formatter: (p: any) => p.data[3], color: PALETTE.textMain, fontSize: 9, fontFamily: 'Rajdhani', position: 'top' },
    }],
  }), []);

  // 4. 价值雷达图 - 5个子系统综合评分
  const valueRadarOption = useMemo(() => ({
    tooltip: { ...commonTooltip },
    legend: {
      data: ['现状', '行业基准'],
      textStyle: { color: PALETTE.textMid, fontSize: 10 },
      top: 0, right: 0, itemWidth: 10, itemHeight: 6,
    },
    radar: {
      indicator: [
        { name: '配电网', max: 100 },
        { name: '光伏', max: 100 },
        { name: '充电桩', max: 100 },
        { name: '空调节能', max: 100 },
        { name: '楼宇控制', max: 100 },
      ],
      center: ['50%', '55%'],
      radius: '62%',
      axisName: { color: PALETTE.textMid, fontSize: 10, fontFamily: 'Rajdhani' },
      splitLine: { lineStyle: { color: 'rgba(0,212,255,0.15)' } },
      splitArea: { areaStyle: { color: ['rgba(0,212,255,0.02)', 'rgba(0,212,255,0.04)'] } },
      axisLine: { lineStyle: { color: 'rgba(0,212,255,0.2)' } },
    },
    series: [{
      type: 'radar',
      data: [
        { value: [82, 76, 88, 71, 85], name: '现状', areaStyle: { color: 'rgba(0,212,255,0.25)' }, lineStyle: { color: PALETTE.primary, width: 2 }, itemStyle: { color: PALETTE.primary } },
        { value: [65, 60, 70, 60, 65], name: '行业基准', areaStyle: { color: 'rgba(255,170,68,0.15)' }, lineStyle: { color: PALETTE.warn, width: 1.5, type: 'dashed' }, itemStyle: { color: PALETTE.warn } },
      ],
    }],
  }), []);

  // 5. 子系统能效对比柱状图
  const efficiencyOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'axis' },
    legend: {
      data: ['能效', '潜力'],
      textStyle: { color: PALETTE.textMid, fontSize: 10 },
      top: 0, right: 0, itemWidth: 10, itemHeight: 6,
    },
    grid: { ...commonGrid, left: 36, right: 12, top: 26, bottom: 22 },
    xAxis: { type: 'category', data: ['配电网', '光伏', '充电桩', '空调节能', '楼宇控制'], ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9 } },
    yAxis: { type: 'value', max: 100, ...commonAxis },
    series: [
      { name: '能效', type: 'bar', barWidth: 14, data: [82, 76, 88, 71, 85], itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.primary }, { offset: 1, color: PALETTE.primaryDeep }] }, borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top', color: PALETTE.primary, fontSize: 10, fontFamily: 'Orbitron' } },
      { name: '潜力', type: 'bar', barWidth: 14, data: [12, 24, 8, 19, 15], itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.cyanGlow }, { offset: 1, color: PALETTE.cyanGlow + '40' }] }, borderRadius: [3, 3, 0, 0] }, label: { show: true, position: 'top', color: PALETTE.cyanGlow, fontSize: 10, fontFamily: 'Orbitron' } },
    ],
  }), []);

  // 6. 减碳贡献饼图
  const carbonOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'item', formatter: '{b}: {c} kgCO₂ ({d}%)' },
    legend: { orient: 'vertical', right: 6, top: 'middle', textStyle: { color: PALETTE.textMid, fontSize: 10 }, itemWidth: 8, itemHeight: 8 },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#02070f', borderWidth: 2 },
      label: { color: PALETTE.textMain, fontSize: 10, fontFamily: 'Orbitron' },
      data: [
        { value: (pvOutput * 0.5810 * 24 / 1000 * 1000).toFixed(0), name: '光伏减碳', itemStyle: { color: PALETTE.success } },
        { value: 8.5, name: '储能减碳', itemStyle: { color: PALETTE.cyanGlow } },
        { value: 4.2, name: '充电桩替代', itemStyle: { color: PALETTE.primary } },
        { value: 2.1, name: '空调优化', itemStyle: { color: PALETTE.warn } },
      ],
    }],
  }), [pvOutput]);

  // 5 个子系统数据
  const subsystems: SubsystemCardProps[] = [
    {
      title: '配电网', icon: '🔌', accent: PALETTE.primary,
      status: { label: '当前负荷', value: totalLoad.toFixed(1), unit: 'kW' },
      problem: { label: 'III段母线负载 78%', level: 'warn' },
      value: { label: '需量节约', delta: '12.5%', trend: 'up' },
      spark: [42, 45, 48, 44, 50, 52, 55, 53, 58, 56, 60, totalLoad],
    },
    {
      title: '光伏发电', icon: '☀', accent: PALETTE.warn,
      status: { label: '实时功率', value: pvOutput.toFixed(1), unit: 'kW' },
      problem: { label: '屋顶东积灰 12%', level: 'warn' },
      value: { label: '度电节约', delta: '33.3%', trend: 'up' },
      spark: [0, 0, 5, 12, 22, 30, 38, 45, 48, 42, 35, pvOutput],
    },
    {
      title: '充电桩', icon: '⚡', accent: PALETTE.success,
      status: { label: '在线桩数', value: '1,459', unit: '个' },
      problem: { label: '5 桩故障 / 12 离线', level: 'danger' },
      value: { label: '日收益', delta: '4,989元', trend: 'up' },
      spark: [320, 380, 410, 450, 480, 520, 490, 510, 540, 560, 580, 590],
    },
    {
      title: '空调节能', icon: '❄', accent: PALETTE.danger,
      status: { label: '运行台数', value: acOn ? '21' : '0', unit: '台' },
      problem: { label: 'AC-07 出风温差大', level: 'warn' },
      value: { label: '节能率', delta: '23.5%', trend: 'up' },
      spark: [18, 19, 20, 21, 21, 20, 21, 21, 20, 21, 21, 21],
    },
    {
      title: '楼宇控制', icon: '🏢', accent: PALETTE.cyanGlow,
      status: { label: '在线设备', value: lightingOn ? '75' : '0', unit: '台' },
      problem: { label: '照明系统正常', level: 'ok' },
      value: { label: '综合能效', delta: '23.5%', trend: 'up' },
      spark: [60, 62, 65, 68, 70, 72, 75, 78, 80, 82, 84, 85],
    },
  ];

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40, overflow: 'hidden' }}>
      {/* 顶部 KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
        {[
          { label: '今日总供电量', value: (totalLoad * 24).toFixed(0), unit: 'kWh', sub: '同比 ⬇ 3.2%', color: '#00d4ff', icon: '⚡' },
          { label: '综合能效指数', value: '23.5', unit: '%', sub: '优于行业', color: '#00ffcc', icon: '📈' },
          { label: '资产运行天数', value: '1,247', unit: '天', sub: '0 事故', color: '#00ff88', icon: '🛡' },
          { label: '新能源消纳率', value: pvSelfRate.toFixed(1), unit: '%', sub: '光伏自用', color: '#ffcc44', icon: '☀' },
          { label: '风险预警', value: '3', unit: '项', sub: '1高 2中', color: '#ffaa44', icon: '⚠' },
          { label: '今日减碳量', value: (pvOutput * 0.5810 * 24 / 1000).toFixed(2), unit: 'tCO₂', sub: '光伏+储能', color: '#00ff88', icon: '🌱' },
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

      {/* 5 个子系统卡片 - 现状/问题/价值 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
        {subsystems.map((s, i) => <SubsystemCard key={i} {...s} />)}
      </div>

      {/* 主图表区 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: '10px', minHeight: 0 }}>
        {/* 左：24h 多源负荷趋势 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>📊 24h 多源负荷堆叠趋势 (kW)</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={trendOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
        {/* 中：风险预警矩阵 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>⚠ 风险预警矩阵 (概率×影响)</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={riskMatrixOption} height="100%" style={{ height: '100%' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '9px', marginTop: '4px' }}>
            <span style={{ color: PALETTE.success }}>● 低风险</span>
            <span style={{ color: PALETTE.warn }}>● 中风险</span>
            <span style={{ color: PALETTE.danger }}>● 高风险</span>
          </div>
        </div>
        {/* 右：能源流向桑基图 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>🌐 多源能源流向</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={energyFlowOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
      </div>

      {/* 底部：价值呈现 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: '10px', minHeight: '170px' }}>
        <div className="panel" style={{ ...panelStyle }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>🎯 子系统综合价值雷达</div>
          <EChart option={valueRadarOption} height={140} />
        </div>
        <div className="panel" style={{ ...panelStyle }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>💎 能效与潜力对比</div>
          <EChart option={efficiencyOption} height={140} />
        </div>
        <div className="panel" style={{ ...panelStyle }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>🌱 减碳贡献构成</div>
          <EChart option={carbonOption} height={140} />
        </div>
      </div>
    </div>
  );
}
