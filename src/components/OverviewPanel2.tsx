'use client';
import { useMemo, useEffect, useRef } from 'react';
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

  // 轮播索引
  const carouselRef = useRef(0);

  // 1. 各业态功率占比 - 环形仪表盘
  const gaugeOption = useMemo(() => ({
    series: [{
      type: 'gauge', radius: '85%', center: ['50%', '55%'],
      startAngle: 90, endAngle: -270,
      min: 0, max: 200,
      progress: { show: true, width: 14, roundCap: true,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [
          { offset: 0, color: PALETTE.primary }, { offset: 0.5, color: PALETTE.cyanGlow }, { offset: 1, color: PALETTE.success }
        ]} } },
      axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(0,212,255,0.06)']] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      pointer: { show: false }, anchor: { show: false },
      title: { show: false },
      detail: { valueAnimation: true, offsetCenter: [0, '-10%'],
        formatter: '{value}', color: PALETTE.cyanGlow, fontSize: 36, fontFamily: 'Orbitron', fontWeight: 700 },
      data: [{ value: totalLoad.toFixed(0) }],
    }],
    graphic: [
      { type: 'text', left: 'center', top: '68%', style: { text: 'MW 总功率', fill: PALETTE.textDim, fontSize: 11, fontFamily: 'Rajdhani' } },
      { type: 'text', left: 'center', top: '80%', style: { text: '实时监测', fill: PALETTE.success, fontSize: 10, fontFamily: 'Rajdhani' } },
    ],
  }), [totalLoad]);

  // 2. 24h 功率流 - 多业态堆叠面积
  const powerFlowOption = useMemo(() => {
    const hours = Array.from({ length: 25 }, (_, i) => i + ':00');
    const gen = (base: number, phase: number) => hours.map((_, i) => +(base * (0.35 + 0.65 * Math.max(0, Math.sin((i - 6 + phase) / 24 * Math.PI * 2 + Math.PI / 2)))).toFixed(1));
    return {
      tooltip: { ...commonTooltip, trigger: 'axis' },
      legend: { data: ['配电网', '光伏', '充电桩', '空调节能', '楼宇控制'], textStyle: { color: PALETTE.textMid, fontSize: 9 }, top: 0, right: 0, itemWidth: 8, itemHeight: 6 },
      grid: { ...commonGrid, left: 36, right: 12, top: 26, bottom: 24 },
      xAxis: { type: 'category', data: hours, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9, interval: 4 } },
      yAxis: { type: 'value', name: 'kW', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [
        { name: '配电网', type: 'line', stack: 'a', smooth: true, symbol: 'none', data: gen(gridLoad, 0), lineStyle: { width: 0 }, areaStyle: { color: PALETTE.primary, opacity: 0.7 } },
        { name: '光伏', type: 'line', stack: 'a', smooth: true, symbol: 'none', data: gen(pvOutput, 2), lineStyle: { width: 0 }, areaStyle: { color: '#ff8844', opacity: 0.7 } },
        { name: '充电桩', type: 'line', stack: 'a', smooth: true, symbol: 'none', data: gen(chargingLoad, -1), lineStyle: { width: 0 }, areaStyle: { color: PALETTE.success, opacity: 0.7 } },
        { name: '空调节能', type: 'line', stack: 'a', smooth: true, symbol: 'none', data: gen(acLoad, 1), lineStyle: { width: 0 }, areaStyle: { color: PALETTE.danger, opacity: 0.7 } },
        { name: '楼宇控制', type: 'line', stack: 'a', smooth: true, symbol: 'none', data: gen(buildingLoad, 0.5), lineStyle: { width: 0 }, areaStyle: { color: PALETTE.cyanGlow, opacity: 0.7 } },
      ],
    };
  }, [gridLoad, pvOutput, chargingLoad, acLoad, buildingLoad]);

  // 3. 业态轮播数据
  const businesses = [
    { name: '配电网', value: gridLoad, unit: 'kW', color: PALETTE.primary, icon: '⚡', desc: '4段母线 · 电压10kV', trend: '+2.3%', trendUp: true, data: [42, 45, 48, 44, 50, 52, 55, 53, 58, 56, 60, gridLoad] },
    { name: '光伏发电', value: pvOutput, unit: 'kW', color: '#ff8844', icon: '☀', desc: '48站 · 日发260kWh', trend: '+12.5%', trendUp: true, data: [0, 0, 5, 12, 22, 30, 38, 45, 48, 42, 35, pvOutput] },
    { name: '充电桩', value: chargingLoad, unit: 'kW', color: PALETTE.success, icon: '🔌', desc: '1,459桩 · 66.7%利用率', trend: '+8.2%', trendUp: true, data: [320, 380, 410, 450, 480, 520, 490, 510, 540, 560, 580, 590] },
    { name: '空调节能', value: acLoad, unit: 'kW', color: PALETTE.danger, icon: '❄', desc: '21台 · 节能率23.5%', trend: '-3.1%', trendUp: false, data: [18, 19, 20, 21, 21, 20, 21, 21, 20, 21, 21, 21] },
    { name: '楼宇控制', value: buildingLoad, unit: 'kW', color: PALETTE.cyanGlow, icon: '🏢', desc: '75台 · 能效23.5%', trend: '+5.6%', trendUp: true, data: [60, 62, 65, 68, 70, 72, 75, 78, 80, 82, 84, 85] },
  ];

  // 轮播 sparkline Canvas
  const sparkCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      carouselRef.current = (carouselRef.current + 1) % businesses.length;
      const idx = carouselRef.current;
      const b = businesses[idx];
      // 更新 DOM
      const nameEl = document.getElementById('carousel-name');
      const valueEl = document.getElementById('carousel-value');
      const descEl = document.getElementById('carousel-desc');
      const trendEl = document.getElementById('carousel-trend');
      const iconEl = document.getElementById('carousel-icon');
      if (nameEl) { nameEl.textContent = b.name; nameEl.style.color = b.color; }
      if (valueEl) { valueEl.textContent = b.value + b.unit; valueEl.style.color = b.color; }
      if (descEl) descEl.textContent = b.desc;
      if (trendEl) { trendEl.textContent = (b.trendUp ? '↑' : '↓') + ' ' + b.trend; trendEl.style.color = b.trendUp ? PALETTE.success : PALETTE.danger; }
      if (iconEl) iconEl.textContent = b.icon;
      // 绘制 sparkline
      const canvas = sparkCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        const d = b.data;
        const mx = Math.max(...d), mn = Math.min(...d);
        const range = mx - mn || 1;
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, b.color + '60'); grad.addColorStop(1, b.color + '00');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.moveTo(0, H);
        d.forEach((v, i) => { const x = i / (d.length - 1) * W; const y = H - (v - mn) / range * (H - 4) - 2; ctx.lineTo(x, y); });
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = b.color; ctx.lineWidth = 2; ctx.shadowColor = b.color; ctx.shadowBlur = 4;
        ctx.beginPath();
        d.forEach((v, i) => { const x = i / (d.length - 1) * W; const y = H - (v - mn) / range * (H - 4) - 2; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
        ctx.stroke();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40, overflow: 'hidden' }}>
      {/* 顶部 5 业态 KPI 卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
        {businesses.map((b, i) => (
          <div key={i} className="panel" style={{ ...panelStyle, borderLeft: `3px solid ${b.color}`, position: 'relative', overflow: 'hidden' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            {/* 背景光效 */}
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '60px', height: '60px', borderRadius: '50%', background: `radial-gradient(circle, ${b.color}20 0%, transparent 70%)`, pointerEvents: 'none' }}></div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '16px' }}>{b.icon}</span>{b.name}
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '26px', fontWeight: 700, color: b.color, textShadow: `0 0 16px ${b.color}60`, lineHeight: 1.1 }}>
              {b.value}<span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: '3px' }}>{b.unit}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-mid)' }}>{b.desc}</span>
              <span style={{ fontSize: '10px', color: b.trendUp ? 'var(--success)' : 'var(--danger)', fontFamily: 'Orbitron', fontWeight: 600 }}>{b.trendUp ? '↑' : '↓'} {b.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 主图区：中国地图 + 总功率仪表盘 + 业态轮播 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.8fr 0.8fr 1fr', gap: '10px', minHeight: 0 }}>
        {/* 中国地图 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          {/* 地图顶部标题栏 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', zIndex: 2 }}>
            <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 700, letterSpacing: '2px' }}>🇨🇳 全国业态分布</span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 6px var(--primary)' }}></span>31省覆盖</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }}></span>实时同步</span>
            </div>
          </div>
          {/* 地图底部数据条 */}
          <div style={{ position: 'absolute', bottom: '8px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: 'rgba(0,212,255,0.06)', borderRadius: '4px', backdropFilter: 'blur(8px)', zIndex: 2, border: '1px solid rgba(0,212,255,0.15)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-mid)' }}>全国总负荷</span>
            <span style={{ fontFamily: 'Orbitron', fontSize: '14px', color: 'var(--cyan-glow)', fontWeight: 700 }}>3,286 <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>MW</span></span>
            <span style={{ fontSize: '10px', color: 'var(--success)' }}>↑ 5.2%</span>
            <span style={{ fontSize: '10px', color: 'var(--text-mid)' }}>|</span>
            <span style={{ fontSize: '10px', color: 'var(--text-mid)' }}>覆盖省份</span>
            <span style={{ fontFamily: 'Orbitron', fontSize: '14px', color: 'var(--primary)', fontWeight: 700 }}>31</span>
            <span style={{ fontSize: '10px', color: 'var(--text-mid)' }}>|</span>
            <span style={{ fontSize: '10px', color: 'var(--text-mid)' }}>站点</span>
            <span style={{ fontFamily: 'Orbitron', fontSize: '14px', color: 'var(--warn)', fontWeight: 700 }}>186</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChinaMap height="100%" />
          </div>
        </div>

        {/* 总功率仪表盘 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>⚡ 总功率监测</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={gaugeOption} height="100%" style={{ height: '100%' }} />
          </div>
          {/* 底部小指标 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '8px 0 0 0' }}>
            <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(0,255,136,0.06)', borderRadius: '4px', border: '1px solid rgba(0,255,136,0.15)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>今日减碳</div>
              <div style={{ fontFamily: 'Orbitron', fontSize: '14px', color: 'var(--success)', fontWeight: 700 }}>0.45<span style={{ fontSize: '8px' }}>tCO₂</span></div>
            </div>
            <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(0,212,255,0.06)', borderRadius: '4px', border: '1px solid rgba(0,212,255,0.15)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>等效植树</div>
              <div style={{ fontFamily: 'Orbitron', fontSize: '14px', color: 'var(--primary)', fontWeight: 700 }}>13,906<span style={{ fontSize: '8px' }}>棵</span></div>
            </div>
          </div>
        </div>

        {/* 业态轮播展示 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, letterSpacing: '1px' }}>📊 业态巡检</span>
            <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>每3s轮播</span>
          </div>
          {/* 轮播内容 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div id="carousel-icon" style={{ fontSize: '32px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,212,255,0.08)', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.2)' }}>⚡</div>
              <div style={{ flex: 1 }}>
                <div id="carousel-name" style={{ fontSize: '16px', fontWeight: 700, color: PALETTE.primary }}>配电网</div>
                <div id="carousel-desc" style={{ fontSize: '10px', color: 'var(--text-mid)', marginTop: '2px' }}>4段母线 · 电压10kV</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <span id="carousel-value" style={{ fontFamily: 'Orbitron', fontSize: '28px', fontWeight: 700, color: PALETTE.primary, textShadow: '0 0 12px rgba(0,212,255,0.4)' }}>52.0kW</span>
              <span id="carousel-trend" style={{ fontFamily: 'Orbitron', fontSize: '12px', color: PALETTE.success, fontWeight: 600 }}>↑ +2.3%</span>
            </div>
            {/* sparkline */}
            <canvas ref={sparkCanvasRef} width={200} height={50} style={{ width: '100%', height: '50px' }}></canvas>
            {/* 进度指示器 */}
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px', justifyContent: 'center' }}>
              {businesses.map((_, i) => (
                <div key={i} style={{ width: '20px', height: '3px', borderRadius: '2px', background: 'rgba(0,212,255,0.15)' }}></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部：24h 功率流堆叠面积 */}
      <div style={{ minHeight: '200px' }}>
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, letterSpacing: '1px' }}>📈 24h 各业态功率流 (kW)</span>
            <div style={{ display: 'flex', gap: '10px', fontSize: '10px' }}>
              <span style={{ color: 'var(--success)' }}>峰值 124.8 kW</span>
              <span style={{ color: 'var(--text-dim)' }}>|</span>
              <span style={{ color: 'var(--primary)' }}>均值 68.5 kW</span>
              <span style={{ color: 'var(--text-dim)' }}>|</span>
              <span style={{ color: 'var(--warn)' }}>谷值 28.3 kW</span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <EChart option={powerFlowOption} height="100%" style={{ height: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
