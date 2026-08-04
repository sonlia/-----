'use client';
import { useMemo, useEffect, useRef, useState } from 'react';
import EChart, { PALETTE, commonGrid, commonTooltip, commonAxis } from './EChart';
import ChinaMap from './ChinaMap';

interface OverviewPanel2Props { kpiPower: string; }

// 时间维度
type TimeRange = 'today' | 'week' | 'month' | 'year';

export default function OverviewPanel2({ kpiPower }: OverviewPanel2Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };

  // 根据时间维度调整数据
  const multiplier = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
  const totalPower = 3286; // MW
  const totalGen = (1248 * multiplier).toLocaleString();
  const carbonReduce = (0.45 * multiplier).toFixed(2);
  const revenue = (4989 * multiplier).toLocaleString();
  const trees = Math.round(13906 * multiplier / 365);

  // 1. 能源结构饼图
  const energyMixOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'item', formatter: '{b}: {c} MW ({d}%)' },
    legend: { orient: 'vertical', right: 4, top: 'middle', textStyle: { color: PALETTE.textMid, fontSize: 9 }, itemWidth: 8, itemHeight: 8 },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['35%', '50%'],
      itemStyle: { borderColor: '#02070f', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, color: PALETTE.textMain, fontSize: 11, fontFamily: 'Orbitron', formatter: '{b}\n{c} MW' } },
      data: [
        { value: 52, name: '配电网', itemStyle: { color: PALETTE.primary } },
        { value: 32.5, name: '光伏', itemStyle: { color: '#ff8844' } },
        { value: 18.6, name: '充电桩', itemStyle: { color: PALETTE.success } },
        { value: 33.4, name: '空调节能', itemStyle: { color: PALETTE.danger } },
        { value: 18.4, name: '楼宇控制', itemStyle: { color: PALETTE.cyanGlow } },
      ],
    }],
  }), []);

  // 2. 电网负荷实时折线图
  const gridLoadOption = useMemo(() => {
    const labels = Array.from({ length: 25 }, (_, i) => i + ':00');
    return {
      tooltip: { ...commonTooltip, trigger: 'axis' },
      grid: { ...commonGrid, left: 36, right: 12, top: 10, bottom: 22 },
      xAxis: { type: 'category', data: labels, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 8, interval: 5 } },
      yAxis: { type: 'value', name: 'MW', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(0,212,255,0.05)' } } },
      series: [{
        type: 'line', smooth: true, symbol: 'none',
        data: labels.map((_, i) => +(totalPower * (0.5 + 0.5 * Math.max(0, Math.sin((i - 6) / 24 * Math.PI * 2 + Math.PI / 2))) / 100).toFixed(1)),
        lineStyle: { color: PALETTE.cyanGlow, width: 2, shadowColor: PALETTE.cyanGlow, shadowBlur: 6 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,255,204,0.3)' }, { offset: 1, color: 'rgba(0,255,204,0)' }] } },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: PALETTE.danger, type: 'dashed', width: 1 }, data: [{ yAxis: 40, name: '上限' }], label: { color: PALETTE.danger, fontSize: 8 } },
      }],
    };
  }, []);

  // 3. 省份绩效排行榜
  const provinceRank = [
    { name: '广东省', score: 98.5, trend: '+2.3%', color: PALETTE.primary },
    { name: '江苏省', score: 95.2, trend: '+1.8%', color: PALETTE.cyanGlow },
    { name: '浙江省', score: 92.8, trend: '+3.1%', color: PALETTE.success },
    { name: '山东省', score: 88.6, trend: '+0.5%', color: PALETTE.warn },
    { name: '四川省', score: 85.3, trend: '+4.2%', color: '#ff8844' },
    { name: '北京市', score: 82.1, trend: '+1.2%', color: PALETTE.primary },
    { name: '湖北省', score: 78.5, trend: '-0.8%', color: PALETTE.danger },
  ];

  // 预警状态
  const alerts = [
    { level: 'green', text: '系统运行正常', count: 0 },
    { level: 'yellow', text: 'III段母线负载偏高', count: 1 },
    { level: 'red', text: '无紧急告警', count: 0 },
  ];

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 40, overflow: 'hidden' }}>
      {/* 流光动态背景 */}
      <div className="flow-bg"></div>
      {/* 全局科幻环形底座 + 超宽模糊动态光束（透明度 40%，位于所有面板之下） */}
      <div className="scene-bg-decor" style={{ opacity: 0.4 }}>
        <div className="light-container">
          <div className="beam-ambient-glow"></div>
          <div className="beam-glow"></div>
          <div className="beam"></div>
          <div className="beam-flow-line"></div>
          <div className="beam-flow-line"></div>
          <div className="beam-flow-line"></div>
        </div>
        <div className="base-perspective">
          <div className="ring-outer"></div>
          <div className="ring-mid"></div>
          <div className="ring-inner"></div>
          <div className="ring-inner-core"></div>
          <div className="ray ray-1"></div>
          <div className="ray ray-2"></div>
          <div className="ray ray-3"></div>
          <div className="ray ray-4"></div>
          <div className="center-core"></div>
        </div>
      </div>
      {/* 飘浮粒子（固定位置避免SSR hydration mismatch） - 整体透明度降到25% */}
      {[
        { left: '12%', top: '15%', delay: '0s', dur: '4s', c: 'rgba(0,255,204,0.25)', size: 12 },
        { left: '85%', top: '22%', delay: '0.5s', dur: '5s', c: 'rgba(0,212,255,0.22)', size: 10 },
        { left: '45%', top: '8%', delay: '1s', dur: '3.5s', c: 'rgba(255,170,68,0.21)', size: 14 },
        { left: '20%', top: '55%', delay: '1.5s', dur: '4.5s', c: 'rgba(0,255,204,0.25)', size: 11 },
        { left: '70%', top: '45%', delay: '2s', dur: '5s', c: 'rgba(0,212,255,0.22)', size: 9 },
        { left: '90%', top: '70%', delay: '2.5s', dur: '3.8s', c: 'rgba(255,136,0,0.21)', size: 13 },
        { left: '15%', top: '80%', delay: '3s', dur: '4.2s', c: 'rgba(0,255,204,0.25)', size: 10 },
        { left: '55%', top: '85%', delay: '3.5s', dur: '5s', c: 'rgba(0,212,255,0.22)', size: 12 },
        { left: '35%', top: '35%', delay: '4s', dur: '4s', c: 'rgba(255,170,68,0.21)', size: 8 },
        { left: '75%', top: '15%', delay: '4.5s', dur: '5.5s', c: 'rgba(0,255,204,0.25)', size: 14 },
        { left: '5%', top: '40%', delay: '5s', dur: '3.5s', c: 'rgba(0,212,255,0.22)', size: 9 },
        { left: '60%', top: '60%', delay: '5.5s', dur: '4.5s', c: 'rgba(255,136,0,0.21)', size: 11 },
        { left: '25%', top: '25%', delay: '6s', dur: '4.8s', c: 'rgba(0,255,204,0.25)', size: 10 },
        { left: '80%', top: '50%', delay: '6.5s', dur: '4.2s', c: 'rgba(0,212,255,0.22)', size: 13 },
        { left: '40%', top: '65%', delay: '7s', dur: '5.2s', c: 'rgba(255,170,68,0.21)', size: 9 },
        { left: '65%', top: '30%', delay: '7.5s', dur: '4.5s', c: 'rgba(0,255,204,0.25)', size: 11 },
      ].map((p, i) => (
        <div key={i} className="float-particle" style={{
          left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.dur, color: p.c, width: p.size + 'px', height: p.size + 'px',
        }}></div>
      ))}
      {/* 顶部时间切换 + 预警灯 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* 时间维度切换 */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-panel)', border: '1px solid var(--border-line)', borderRadius: '6px', padding: '4px', backdropFilter: 'blur(14px)' }}>
          {([['today', '今日'], ['week', '本周'], ['month', '本月'], ['year', '本年']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTimeRange(key)} style={{
              padding: '6px 16px', fontSize: '12px', fontWeight: 600, letterSpacing: '1px',
              border: '1px solid ' + (timeRange === key ? 'var(--primary)' : 'transparent'),
              background: timeRange === key ? 'var(--primary-bg)' : 'transparent',
              color: timeRange === key ? 'var(--primary)' : 'var(--text-mid)',
              borderRadius: '4px', cursor: 'pointer', transition: 'all 0.25s',
              boxShadow: timeRange === key ? '0 0 12px rgba(0,212,255,0.3)' : 'none',
            }}>{label}</button>
          ))}
        </div>
        {/* 预警灯 */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border-line)', borderRadius: '6px', padding: '6px 16px', backdropFilter: 'blur(14px)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '1px' }}>系统预警</span>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: a.level === 'green' ? PALETTE.success : a.level === 'yellow' ? PALETTE.warn : PALETTE.danger,
                boxShadow: `0 0 8px ${a.level === 'green' ? PALETTE.success : a.level === 'yellow' ? PALETTE.warn : PALETTE.danger}`,
                animation: a.count > 0 ? 'pulse 1.5s infinite' : 'none',
              }}></div>
              <span style={{ fontSize: '10px', color: 'var(--text-mid)' }}>{a.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 顶部 3 核心 KPI（玻璃拟态卡片） */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
        {[
          { label: '总发电量', value: totalGen, unit: 'kWh', sub: '同比 ⬇ 3.2%', color: PALETTE.primary, icon: '⚡', trend: [42, 45, 48, 44, 50, 52, 55, 53, 58, 56, 60, 62] },
          { label: '碳减排量', value: carbonReduce, unit: 'tCO₂', sub: '等效植树 ' + trees + ' 棵', color: PALETTE.success, icon: '🌱', trend: [10, 15, 20, 25, 30, 28, 35, 32, 38, 40, 42, 45] },
          { label: '运营收益', value: '¥' + revenue, unit: '', sub: '同比 ⬆ 12.5%', color: PALETTE.warn, icon: '💰', trend: [200, 350, 500, 680, 820, 950, 1100, 1250, 1400, 1550, 1700, 1860] },
        ].map((kpi, i) => {
          const sparkCanvasRef = useRef<HTMLCanvasElement>(null);
          useEffect(() => {
            const canvas = sparkCanvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d')!;
            const W = 100, H = 28;
            canvas.width = W * 2; canvas.height = H * 2; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
            ctx.scale(2, 2); ctx.clearRect(0, 0, W, H);
            const d = kpi.trend; const mx = Math.max(...d), mn = Math.min(...d); const range = mx - mn || 1;
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, kpi.color + '50'); grad.addColorStop(1, kpi.color + '00');
            ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(0, H);
            d.forEach((v, j) => { const x = j / (d.length - 1) * W; const y = H - (v - mn) / range * (H - 4) - 2; ctx.lineTo(x, y); });
            ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = kpi.color; ctx.lineWidth = 1.5; ctx.shadowColor = kpi.color; ctx.shadowBlur = 3;
            ctx.beginPath();
            d.forEach((v, j) => { const x = j / (d.length - 1) * W; const y = H - (v - mn) / range * (H - 4) - 2; j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
            ctx.stroke();
          }, []);
          return (
            <div key={i} className="panel" style={{ ...panelStyle, position: 'relative', overflow: 'hidden',
              background: 'rgba(8, 18, 38, 0.4)',
              border: '1px solid rgba(0,212,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,212,255,0.03)',
            }}>
              <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div className="panel-scan" style={{ animationDelay: '0.5s' }}></div>
            <div className="panel-scan-bottom" style={{ animationDelay: '1s' }}></div>
              {/* 玻璃光效 */}
              <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: `radial-gradient(circle, ${kpi.color}15 0%, transparent 70%)`, pointerEvents: 'none' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '2px' }}>
                    <span style={{ fontSize: '16px' }}>{kpi.icon}</span>{kpi.label}
                  </div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '32px', fontWeight: 700, color: kpi.color, textShadow: `0 0 20px ${kpi.color}50`, lineHeight: 1.1 }}>
                    {kpi.value}<span style={{ fontSize: '14px', color: 'var(--text-dim)', marginLeft: '4px' }}>{kpi.unit}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: kpi.color, marginTop: '4px', opacity: 0.8 }}>{kpi.sub}</div>
                </div>
                <canvas ref={sparkCanvasRef} style={{ marginTop: '4px' }}></canvas>
              </div>
            </div>
          );
        })}
      </div>

      {/* 主图区：中国地图(中心) + 左侧能源结构+电网负荷 + 右侧省份排行+环境效益 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.8fr 1fr', gap: '14px', minHeight: 0 }}>
        {/* 左侧：能源结构 + 电网负荷 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div className="panel-scan" style={{ animationDelay: '0.5s' }}></div>
            <div className="panel-scan-bottom" style={{ animationDelay: '1s' }}></div>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>📊 能源结构</div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <EChart option={energyMixOption} height="100%" style={{ height: '100%' }} />
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div className="panel-scan" style={{ animationDelay: '0.5s' }}></div>
            <div className="panel-scan-bottom" style={{ animationDelay: '1s' }}></div>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>📈 电网负荷 (MW)</div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <EChart option={gridLoadOption} height="100%" style={{ height: '100%' }} />
            </div>
          </div>
        </div>

        {/* 中心：中国地图 */}
        <div className="panel" style={{ ...panelStyle, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
          background: 'rgba(8, 18, 38, 0.4)',
          border: '1px solid rgba(0,212,255,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,212,255,0.04)',
        }}>
          <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
          {/* 科幻环形底座 + 超宽模糊动态光束 已移至全局背景层（在最外层 div 内） */}
          {/* 地图标题 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', zIndex: 2 }}>
            <span style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: 700, letterSpacing: '2px' }}>🇨🇳 全国项目分布</span>
            <div style={{ display: 'flex', gap: '10px', fontSize: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff8844', boxShadow: '0 0 6px #ff8844' }}></span>光伏</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: PALETTE.success, boxShadow: '0 0 6px ' + PALETTE.success }}></span>充电桩</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: PALETTE.primary, boxShadow: '0 0 6px ' + PALETTE.primary }}></span>楼宇节能</span>
            </div>
          </div>
          {/* 地图底部数据栏 */}
          <div className="border-pulse" style={{ position: 'absolute', bottom: '8px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 16px', background: 'rgba(0,212,255,0.08)', borderRadius: '6px', backdropFilter: 'blur(12px)', zIndex: 2, border: '1px solid rgba(0,212,255,0.2)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: '18px', color: 'var(--cyan-glow)', fontWeight: 700, textShadow: '0 0 8px rgba(0,255,204,0.4)' }}>3,286<span style={{ fontSize: '9px', color: 'var(--text-dim)', marginLeft: '2px' }}>MW</span></div>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>全国总负荷</div>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(0,212,255,0.2)' }}></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: '18px', color: 'var(--primary)', fontWeight: 700 }}>31<span style={{ fontSize: '9px', color: 'var(--text-dim)', marginLeft: '2px' }}>省</span></div>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>覆盖省份</div>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(0,212,255,0.2)' }}></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: '18px', color: 'var(--warn)', fontWeight: 700 }}>186<span style={{ fontSize: '9px', color: 'var(--text-dim)', marginLeft: '2px' }}>站</span></div>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>站点总数</div>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(0,212,255,0.2)' }}></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: '18px', color: 'var(--success)', fontWeight: 700 }}>98.5<span style={{ fontSize: '9px', color: 'var(--text-dim)', marginLeft: '2px' }}>%</span></div>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>在线率</div>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChinaMap height="100%" />
          </div>
        </div>

        {/* 右侧：省份排行 + 环境效益 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 省份绩效排行 */}
          <div className="panel" style={{ ...panelStyle, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div className="panel-scan" style={{ animationDelay: '0.5s' }}></div>
            <div className="panel-scan-bottom" style={{ animationDelay: '1s' }}></div>
            <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>🏆 省份绩效排行</div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {provinceRank.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: 'rgba(0,212,255,0.04)', borderRadius: '4px', border: '1px solid rgba(0,212,255,0.08)' }}>
                  <span style={{ fontFamily: 'Orbitron', fontSize: '14px', fontWeight: 700, color: i < 3 ? p.color : 'var(--text-dim)', width: '20px', textAlign: 'center' }}>{i + 1}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-main)', flex: 1 }}>{p.name}</span>
                  <div style={{ width: '60px', height: '6px', background: 'rgba(0,212,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div className="bar-shine" style={{ height: '100%', width: `${p.score}%`, background: p.color, color: p.color }}></div>
                  </div>
                  <span style={{ fontFamily: 'Orbitron', fontSize: '11px', color: p.color, fontWeight: 600, width: '36px', textAlign: 'right' }}>{p.score}</span>
                </div>
              ))}
            </div>
          </div>
          {/* 环境效益 */}
          <div className="panel" style={{ ...panelStyle, minHeight: '0' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div className="panel-scan" style={{ animationDelay: '0.5s' }}></div>
            <div className="panel-scan-bottom" style={{ animationDelay: '1s' }}></div>
            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>🌱 环境效益</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,255,136,0.06)', borderRadius: '6px', border: '1px solid rgba(0,255,136,0.15)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>等效植树</div>
                <div style={{ fontFamily: 'Orbitron', fontSize: '18px', color: 'var(--success)', fontWeight: 700, textShadow: '0 0 8px rgba(0,255,136,0.3)' }}>{trees.toLocaleString()}<span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>棵</span></div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,255,204,0.06)', borderRadius: '6px', border: '1px solid rgba(0,255,204,0.15)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>节约标煤</div>
                <div style={{ fontFamily: 'Orbitron', fontSize: '18px', color: 'var(--cyan-glow)', fontWeight: 700 }}>{(0.155 * multiplier).toFixed(1)}<span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>t</span></div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,212,255,0.06)', borderRadius: '6px', border: '1px solid rgba(0,212,255,0.15)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>SO₂减排</div>
                <div style={{ fontFamily: 'Orbitron', fontSize: '18px', color: 'var(--primary)', fontWeight: 700 }}>{(1.32 * multiplier).toFixed(0)}<span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>kg</span></div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,170,68,0.06)', borderRadius: '6px', border: '1px solid rgba(255,170,68,0.15)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>NOx减排</div>
                <div style={{ fontFamily: 'Orbitron', fontSize: '18px', color: 'var(--warn)', fontWeight: 700 }}>{(0.71 * multiplier).toFixed(0)}<span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>kg</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
