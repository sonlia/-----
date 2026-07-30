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
  const totalControllable = totalLoad * 0.35; // 35% 可控
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

  // 4. 负荷曲线 + 响应曲线 + 响应收益曲线（5min 时间点，今日 96 点）
  const loadCurveOption = useMemo(() => {
    // 5 分钟一个点，今日 0:00~24:00 共 288 点；为可读性取每 30min 显示一个标签
    const totalPoints = 288;
    const labels: string[] = [];
    const loadSeries: number[] = [];
    const responseSeries: number[] = [];
    const revenueSeries: number[] = [];
    for (let i = 0; i < totalPoints; i++) {
      const totalMin = i * 5;
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      // 每 30min 显示一个刻度
      labels.push(m === 0 ? `${String(h).padStart(2, '0')}:00` : (m === 30 ? `${String(h).padStart(2, '0')}:30` : ''));
      // 当前总负荷曲线：日间高夜间低（钟形）
      const hourFrac = totalMin / 60;
      const base = totalLoad * (0.35 + 0.65 * Math.max(0, Math.sin((hourFrac - 6) / 24 * Math.PI * 2 + Math.PI / 2)));
      // 工作时段峰值波动
      const peak = hourFrac >= 9 && hourFrac <= 18 ? 8 * Math.sin((hourFrac - 9) / 9 * Math.PI) : 0;
      loadSeries.push(+(base + peak + (Math.random() * 2 - 1)).toFixed(2));
      // 响应负荷曲线：跟随负荷但更平滑（晚峰/早峰响应）
      const respBase = totalControllable * (0.4 + 0.6 * Math.max(0, Math.sin((hourFrac - 6) / 24 * Math.PI * 2 + Math.PI / 2)));
      const respPeak = (hourFrac >= 17 && hourFrac <= 21) ? 6 * Math.sin((hourFrac - 17) / 4 * Math.PI) : 0;
      responseSeries.push(+Math.max(0, respBase + respPeak + (Math.random() * 1 - 0.5)).toFixed(2));
      // 响应收益（累计）：响应负荷 × 单价（元/kWh）按 5min 折算
      const price = (hourFrac >= 8 && hourFrac <= 11) || (hourFrac >= 18 && hourFrac <= 21) ? 1.2 : 0.6; // 峰时1.2元 平时0.6元
      const prev = i === 0 ? 0 : revenueSeries[i - 1];
      revenueSeries.push(+(prev + responseSeries[i] * price * (5 / 60)).toFixed(2));
    }
    return {
      tooltip: {
        ...commonTooltip,
        trigger: 'axis',
        formatter: (params: any) => {
          const idx = params[0].dataIndex;
          const totalMin = idx * 5;
          const h = String(Math.floor(totalMin / 60)).padStart(2, '0');
          const m = String(totalMin % 60).padStart(2, '0');
          return `<b style="color:${PALETTE.primary}">${h}:${m}</b><br/>` +
            params.map((p: any) => `<span style="display:inline-block;width:10px;height:10px;background:${p.color};border-radius:50%;margin-right:6px"></span>${p.seriesName}: <b style="color:${p.color}">${p.value.toFixed(1)} ${p.seriesName === '响应收益' ? '元' : 'kW'}</b>`).join('<br/>');
        },
      },
      legend: { data: ['当前负荷', '响应负荷', '响应收益'], textStyle: { color: PALETTE.textMid, fontSize: 10 }, top: 0, right: 0, itemWidth: 10, itemHeight: 6 },
      grid: { ...commonGrid, left: 44, right: 50, top: 26, bottom: 24 },
      xAxis: { type: 'category', data: labels, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9, interval: 29, rotate: 0 } },
      yAxis: [
        { type: 'value', name: 'kW', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
        { type: 'value', name: '元', nameTextStyle: { color: PALETTE.textDim, fontSize: 9 }, axisLine: { lineStyle: { color: 'rgba(138,165,196,0.3)' } }, axisLabel: { color: PALETTE.textMid, fontSize: 9, fontFamily: 'Rajdhani' }, splitLine: { show: false } },
      ],
      series: [
        {
          name: '当前负荷', type: 'line', smooth: true, symbol: 'none', data: loadSeries, yAxisIndex: 0,
          lineStyle: { color: PALETTE.warn, width: 2 }, itemStyle: { color: PALETTE.warn },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,170,68,0.3)' }, { offset: 1, color: 'rgba(255,170,68,0)' }] } },
        },
        {
          name: '响应负荷', type: 'line', smooth: true, symbol: 'none', data: responseSeries, yAxisIndex: 0,
          lineStyle: { color: PALETTE.success, width: 2 }, itemStyle: { color: PALETTE.success },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,255,136,0.35)' }, { offset: 1, color: 'rgba(0,255,136,0)' }] } },
        },
        {
          name: '响应收益', type: 'line', smooth: true, symbol: 'none', data: revenueSeries, yAxisIndex: 1,
          lineStyle: { color: PALETTE.cyanGlow, width: 2, type: 'dashed' }, itemStyle: { color: PALETTE.cyanGlow },
        },
      ],
    };
  }, [totalLoad, totalControllable]);

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

      {/* 负荷管理总览行 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1.6fr', gap: '10px', minHeight: '90px' }}>
        {[
          { label: '当前总负荷', value: totalLoad.toFixed(1), unit: 'kW', sub: `负载率 ${(totalLoad / 200 * 100).toFixed(1)}%`, color: PALETTE.warn, icon: '⚡' },
          { label: '可控负荷', value: (totalLoad * 0.35).toFixed(1), unit: 'kW', sub: `占比 35.0%`, color: PALETTE.success, icon: '🎛' },
          { label: '快调容量', value: (totalLoad * 0.18).toFixed(1), unit: 'kW', sub: '< 5 分钟响应', color: PALETTE.primary, icon: '⚡' },
          { label: '调节日收益', value: '633', unit: '元', sub: '削峰填谷+补贴', color: PALETTE.warn, icon: '💰' },
        ].map((k, i) => (
          <div key={i} className="panel" style={{ ...panelStyle, borderLeft: `3px solid ${k.color}` }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '14px' }}>{k.icon}</span>{k.label}
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, color: k.color, textShadow: `0 0 8px ${k.color}60`, lineHeight: 1.1 }}>
              {k.value}<span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '3px' }}>{k.unit}</span>
            </div>
            <div style={{ fontSize: '9px', color: k.color, marginTop: '3px', opacity: 0.8 }}>{k.sub}</div>
          </div>
        ))}
        {/* 4 段母线负载条 */}
        <div className="panel" style={{ ...panelStyle }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>🎛 母线负载与可调容量</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { n: 'I段', load: 38.5, cap: 60, ctrl: 18.2, col: PALETTE.primary },
              { n: 'II段', load: 25.2, cap: 50, ctrl: 12.4, col: PALETTE.cyanGlow },
              { n: 'III段', load: 18.6, cap: 40, ctrl: 8.5, col: PALETTE.warn },
              { n: '光伏', load: pvOutput, cap: 50, ctrl: 25.0, col: '#ff8844' },
            ].map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px' }}>
                <span style={{ color: 'var(--text-mid)', width: '32px', flexShrink: 0 }}>{b.n}</span>
                <div style={{ flex: 1, height: '10px', background: 'rgba(0,212,255,0.06)', borderRadius: '2px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${b.load / b.cap * 100}%`, background: b.col, boxShadow: `0 0 4px ${b.col}` }}></div>
                  <div style={{ width: `${b.ctrl / b.cap * 100}%`, background: `${PALETTE.success}80`, borderLeft: `1px solid ${PALETTE.success}` }}></div>
                </div>
                <span style={{ color: b.col, fontFamily: 'Orbitron, monospace', width: '40px', textAlign: 'right', flexShrink: 0 }}>{b.load}/{b.cap}</span>
                <span style={{ color: PALETTE.success, fontFamily: 'Orbitron, monospace', width: '28px', textAlign: 'right', flexShrink: 0 }}>+{b.ctrl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部：负荷曲线 + 减碳贡献（负荷/响应/收益 5min曲线 + 减碳饼图） */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr', gap: '10px', minHeight: '180px' }}>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, letterSpacing: '1px' }}>📈 今日负荷曲线 + 响应负荷 + 响应收益（5min 时间点）</span>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>峰时 1.2 元/kWh · 平时 0.6 元/kWh</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={loadCurveOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>🌱 减碳贡献构成</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={carbonOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
