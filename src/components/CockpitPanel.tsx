'use client';
import { useEffect, useRef } from 'react';

interface CockpitPanelProps { kpiPower: string; lightingOn: boolean; acOn: boolean; }

function setupHiDPI(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = '100%'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d')!; ctx.scale(dpr, dpr);
  return ctx;
}

export default function CockpitPanel({ kpiPower, lightingOn, acOn }: CockpitPanelProps) {
  const power = parseFloat(kpiPower || '0');
  const totalLoad = power + 18.6;
  const pvOutput = 32.5;
  const gridPower = Math.max(0, totalLoad - pvOutput);
  const pvSelfRate = pvOutput > 0 ? (Math.min(pvOutput, totalLoad * 0.3) / pvOutput * 100) : 0;
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };

  // === Canvas refs ===
  const loadBarRef = useRef<HTMLCanvasElement>(null);     // 配网负荷柱状图
  const demandGaugeRef = useRef<HTMLCanvasElement>(null); // 需量仪表盘
  const pieRef = useRef<HTMLCanvasElement>(null);         // 供电构成饼图
  const trendRef = useRef<HTMLCanvasElement>(null);       // 24h负荷趋势
  const responseRef = useRef<HTMLCanvasElement>(null);    // 负荷响应能力雷达
  const funnelRef = useRef<HTMLCanvasElement>(null);      // 潜力池漏斗

  // 配网负荷柱状图
  useEffect(() => {
    const c = loadBarRef.current; if (!c) return;
    const W = 260, H = 110, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const bars = [
      { n: 'I段', v: 38.5, cap: 60, col: '#00d4ff' },
      { n: 'II段', v: 25.2, cap: 50, col: '#00ffcc' },
      { n: 'III段', v: 18.6, cap: 40, col: '#ffcc44' },
      { n: '光伏', v: pvOutput, cap: 50, col: '#ff8844' },
    ];
    const mx = Math.max(...bars.map(b => b.cap));
    const bw = W / bars.length * 0.55;
    ctx.strokeStyle = 'rgba(0,212,255,0.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(0, H - 18 - (H - 22) / 3 * i); ctx.lineTo(W, H - 18 - (H - 22) / 3 * i); ctx.stroke(); }
    bars.forEach((b, i) => {
      const x = i * (W / bars.length) + (W / bars.length - bw) / 2;
      const h = b.v / mx * (H - 22);
      // 容量背景
      const hCap = b.cap / mx * (H - 22);
      ctx.fillStyle = 'rgba(0,212,255,0.06)'; ctx.fillRect(x, H - 18 - hCap, bw, hCap);
      // 实际值
      const g = ctx.createLinearGradient(0, H - 18 - h, 0, H - 18);
      g.addColorStop(0, b.col); g.addColorStop(1, b.col + '20');
      ctx.fillStyle = g; ctx.shadowColor = b.col; ctx.shadowBlur = 4;
      ctx.fillRect(x, H - 18 - h, bw, h); ctx.shadowBlur = 0;
      // 顶部数值
      ctx.fillStyle = b.col; ctx.font = 'bold 9px Orbitron'; ctx.textAlign = 'center';
      ctx.fillText(b.v.toFixed(1), x + bw / 2, H - 18 - h - 3);
      // 标签
      ctx.fillStyle = '#8aa5c4'; ctx.font = '9px Rajdhani';
      ctx.fillText(b.n, x + bw / 2, H - 6);
    });
  }, [pvOutput]);

  // 需量仪表盘
  useEffect(() => {
    const c = demandGaugeRef.current; if (!c) return;
    const W = 130, H = 130, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2 + 8, R = 48;
    const demand = Math.min(100, totalLoad / 200 * 100); // 需量百分比
    // 背景弧
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,212,255,0.1)';
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI * 0.75, Math.PI * 0.25); ctx.stroke();
    // 刻度
    ctx.strokeStyle = 'rgba(138,165,196,0.3)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (Math.PI * 1.5) * (i / 10);
      const x1 = cx + Math.cos(a) * (R + 6), y1 = cy + Math.sin(a) * (R + 6);
      const x2 = cx + Math.cos(a) * (R + 10), y2 = cy + Math.sin(a) * (R + 10);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // 值弧（颜色渐变）
    const endAng = Math.PI * 0.75 + (Math.PI * 1.5) * (demand / 100);
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#00ff88'); grad.addColorStop(0.5, '#ffcc44'); grad.addColorStop(1, '#ff4d6d');
    ctx.strokeStyle = grad; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI * 0.75, endAng); ctx.stroke();
    ctx.shadowBlur = 0;
    // 中央数字
    ctx.fillStyle = '#e8f4ff'; ctx.font = 'bold 22px Orbitron'; ctx.textAlign = 'center';
    ctx.fillText(demand.toFixed(0), cx, cy + 2);
    ctx.fillStyle = '#4a6485'; ctx.font = '9px Rajdhani';
    ctx.fillText('% 需量', cx, cy + 16);
  }, [totalLoad]);

  // 供电构成饼图
  useEffect(() => {
    const c = pieRef.current; if (!c) return;
    const W = 140, H = 140, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = 50;
    const total = totalLoad || 1;
    const slices = [
      { v: gridPower, col: '#0088ff' },
      { v: pvOutput, col: '#ffcc44' },
    ];
    let start = -Math.PI / 2;
    slices.forEach(s => {
      const ang = (s.v / total) * Math.PI * 2;
      ctx.fillStyle = s.col; ctx.shadowColor = s.col; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, start + ang); ctx.closePath(); ctx.fill();
      start += ang;
    });
    ctx.shadowBlur = 0;
    // 中心镂空
    ctx.fillStyle = '#02070f'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.6, 0, Math.PI * 2); ctx.fill();
    // 中央数字
    ctx.fillStyle = '#e8f4ff'; ctx.font = 'bold 18px Orbitron'; ctx.textAlign = 'center';
    ctx.fillText(total.toFixed(0), cx, cy + 2);
    ctx.fillStyle = '#4a6485'; ctx.font = '9px Rajdhani';
    ctx.fillText('kW 总负荷', cx, cy + 16);
  }, [totalLoad, gridPower, pvOutput]);

  // 24h 负荷趋势
  useEffect(() => {
    const c = trendRef.current; if (!c) return;
    const W = 260, H = 100, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const x = i / 24 * W;
      const base = totalLoad * (0.4 + 0.6 * Math.sin((i - 6) / 24 * Math.PI * 2 + Math.PI / 2));
      const y = H - 8 - Math.max(0, base) / (totalLoad * 1.2) * (H - 16);
      pts.push([x, y]);
    }
    // 网格
    ctx.strokeStyle = 'rgba(0,212,255,0.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(0, H / 3 * i); ctx.lineTo(W, H / 3 * i); ctx.stroke(); }
    // 填充
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,212,255,0.4)'); grad.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(pts[0][0], H); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // 折线
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 6;
    ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])); ctx.stroke();
    ctx.shadowBlur = 0;
    // 当前点
    const nowIdx = 16;
    ctx.fillStyle = '#00ffcc'; ctx.beginPath(); ctx.arc(pts[nowIdx][0], pts[nowIdx][1], 3, 0, Math.PI * 2); ctx.fill();
    // x 标签
    ctx.fillStyle = '#4a6485'; ctx.font = '8px Rajdhani'; ctx.textAlign = 'center';
    [0, 6, 12, 18, 24].forEach(h => ctx.fillText(h + ':00', h / 24 * W, H - 1));
  }, [totalLoad]);

  // 负荷响应能力雷达图
  useEffect(() => {
    const c = responseRef.current; if (!c) return;
    const W = 130, H = 130, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = 45;
    const dims = [
      { n: '调节占比', v: 0.35 },
      { n: '响应合格', v: 0.92 },
      { n: '响应速率', v: 0.78 },
      { n: '可调容量', v: 0.68 },
      { n: '柔性响应', v: 0.62 },
    ];
    // 网格
    ctx.strokeStyle = 'rgba(0,212,255,0.1)'; ctx.lineWidth = 1;
    for (let r = 0.3; r <= 1; r += 0.35) {
      ctx.beginPath();
      for (let i = 0; i < dims.length; i++) {
        const a = -Math.PI / 2 + (i / dims.length) * Math.PI * 2;
        const x = cx + Math.cos(a) * R * r, y = cy + Math.sin(a) * R * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    // 轴线
    dims.forEach((_, i) => {
      const a = -Math.PI / 2 + (i / dims.length) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
    });
    // 数据多边形
    ctx.fillStyle = 'rgba(0,255,204,0.18)'; ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 2;
    ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 6;
    ctx.beginPath();
    dims.forEach((d, i) => {
      const a = -Math.PI / 2 + (i / dims.length) * Math.PI * 2;
      const x = cx + Math.cos(a) * R * d.v, y = cy + Math.sin(a) * R * d.v;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    // 数据点
    ctx.fillStyle = '#00ffcc';
    dims.forEach((d, i) => {
      const a = -Math.PI / 2 + (i / dims.length) * Math.PI * 2;
      const x = cx + Math.cos(a) * R * d.v, y = cy + Math.sin(a) * R * d.v;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
    });
  }, []);

  // 潜力池漏斗图
  useEffect(() => {
    const c = funnelRef.current; if (!c) return;
    const W = 200, H = 110, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const stages = [
      { n: '总能耗基数', v: totalLoad, col: '#0088ff' },
      { n: '已实现节能', v: totalLoad * 0.25, col: '#00d4ff' },
      { n: '待挖掘潜力', v: totalLoad * 0.15, col: '#00ffcc' },
    ];
    const mx = stages[0].v || 1;
    const fh = (H - 10) / stages.length;
    stages.forEach((s, i) => {
      const wRatio = s.v / mx;
      const w = W * 0.85 * wRatio;
      const x = (W - w) / 2;
      const y = 5 + i * fh;
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, s.col + '40'); g.addColorStop(0.5, s.col); g.addColorStop(1, s.col + '40');
      ctx.fillStyle = g; ctx.shadowColor = s.col; ctx.shadowBlur = 6;
      ctx.fillRect(x, y, w, fh - 4); ctx.shadowBlur = 0;
      ctx.strokeStyle = s.col; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, fh - 4);
      // 文字
      ctx.fillStyle = '#e8f4ff'; ctx.font = 'bold 10px Rajdhani'; ctx.textAlign = 'center';
      ctx.fillText(s.n, W / 2, y + fh / 2 - 2);
      ctx.fillStyle = s.col; ctx.font = 'bold 11px Orbitron';
      ctx.fillText(s.v.toFixed(1) + ' kW', W / 2, y + fh / 2 + 10);
    });
  }, [totalLoad]);

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40, overflow: 'hidden' }}>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
        {[
          { label: '今日总供电量', value: (totalLoad * 24).toFixed(0), unit: 'kWh', sub: '同比 ⬇️ 3.2%', color: '#00d4ff', icon: '⚡' },
          { label: '综合能效提升指数', value: '23.5', unit: '%', sub: '优于行业基准', color: '#00ffcc', icon: '📈' },
          { label: '资产安全运行天数', value: '1,247', unit: '天', sub: '0 事故', color: '#00ff88', icon: '🛡' },
          { label: '新能源消纳率', value: pvSelfRate.toFixed(1), unit: '%', sub: '光伏自用比例', color: '#ffcc44', icon: '☀' },
        ].map((kpi, i) => (
          <div key={i} className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px' }}>{kpi.icon}</span>{kpi.label}
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '30px', fontWeight: 700, color: kpi.color, textShadow: `0 0 12px ${kpi.color}40`, lineHeight: 1.1 }}>
              {kpi.value}<span style={{ fontSize: '13px', color: 'var(--text-dim)', marginLeft: '4px' }}>{kpi.unit}</span>
            </div>
            <div style={{ fontSize: '10px', color: kpi.color, marginTop: '4px', opacity: 0.8 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: '10px', minHeight: 0 }}>
        {/* 左侧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>配网负荷监控</div>
            <canvas ref={loadBarRef} width={260} height={110} style={{ width: '100%', height: '110px' }}></canvas>
            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>总负荷 <span style={{ color: 'var(--primary)', fontFamily: 'Orbitron, monospace' }}>{totalLoad.toFixed(1)}kW</span></span>
              <span>总容量 <span style={{ color: 'var(--text-mid)', fontFamily: 'Orbitron, monospace' }}>200kW</span></span>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>运维告警与健康度</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', padding: '4px 8px', background: 'rgba(0,255,136,0.06)', borderRadius: '3px' }}>
                <span style={{ color: 'var(--success)' }}>🛡 正常</span><span style={{ color: 'var(--text-mid)' }}>变压器运行稳定</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', padding: '4px 8px', background: 'rgba(255,170,68,0.06)', borderRadius: '3px' }}>
                <span style={{ color: 'var(--warn)' }}>⚠ 关注</span><span style={{ color: 'var(--text-mid)' }}>3F 配电柜温度 62°C</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', padding: '4px 8px', background: 'rgba(0,255,136,0.06)', borderRadius: '3px' }}>
                <span style={{ color: 'var(--success)' }}>🛡 正常</span><span style={{ color: 'var(--text-mid)' }}>充电桩群组通信正常</span>
              </div>
            </div>
            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>设备健康度</span><span style={{ color: 'var(--success)', fontFamily: 'Orbitron, monospace' }}>94 / 100</span>
            </div>
          </div>
        </div>

        {/* 中间 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '10px', letterSpacing: '1px' }}>24h 负荷趋势与需量分析</div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <canvas ref={demandGaugeRef} width={130} height={130} style={{ width: '130px', height: '130px', flexShrink: 0 }}></canvas>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-mid)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>当前需量</span><span style={{ color: 'var(--warn)', fontFamily: 'Orbitron, monospace' }}>{totalLoad.toFixed(1)} kW</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-mid)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>申报需量</span><span style={{ color: 'var(--text-main)', fontFamily: 'Orbitron, monospace' }}>200 kW</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-mid)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>需量电费</span><span style={{ color: 'var(--cyan-glow)', fontFamily: 'Orbitron, monospace' }}>¥486</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-mid)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>峰值时段</span><span style={{ color: 'var(--danger)', fontFamily: 'Orbitron, monospace' }}>14:00-17:00</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>今日 24h 负荷曲线 (kW)</div>
              <canvas ref={trendRef} width={260} height={100} style={{ width: '100%', height: '100px' }}></canvas>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, letterSpacing: '1px' }}>🌱 双碳贡献</span>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>碳排放因子 0.581 kgCO₂/kWh</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
              {[
                { label: '今日减碳', val: (pvOutput * 0.5810 * 24 / 1000).toFixed(2), unit: 't CO₂', color: '#00ffcc' },
                { label: '等效植树', val: Math.round(pvOutput * 0.5810 * 24 / 5.8), unit: '棵', color: '#00ff88' },
                { label: '月碳排放', val: (totalLoad * 0.5810 * 24 * 30 / 1000).toFixed(1), unit: 't CO₂', color: '#00d4ff' },
                { label: '年减碳', val: (pvOutput * 0.5810 * 24 * 365 / 1000).toFixed(0), unit: 't CO₂', color: '#ff4d6d' },
              ].map((c, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '6px 4px', background: `${c.color}0d`, borderRadius: '4px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{c.label}</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '15px', fontWeight: 700, color: c.color }}>{c.val}</div>
                  <div style={{ fontSize: '8px', color: 'var(--text-dim)' }}>{c.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>负荷响应能力雷达</div>
            <canvas ref={responseRef} width={130} height={130} style={{ width: '130px', height: '130px', display: 'block', margin: '0 auto' }}></canvas>
            <div style={{ marginTop: '4px', textAlign: 'center', padding: '4px', background: 'rgba(0,255,136,0.06)', borderRadius: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>综合评分 </span>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', color: 'var(--success)', fontWeight: 700 }}>68.6</span>
              <span style={{ fontSize: '10px', color: 'var(--success)', marginLeft: '4px' }}>B 级</span>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>供电构成</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <canvas ref={pieRef} width={140} height={140} style={{ width: '110px', height: '110px', flexShrink: 0 }}></canvas>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', padding: '4px', background: 'rgba(0,136,255,0.06)', borderRadius: '3px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0088ff' }}></span>
                  <span style={{ color: 'var(--text-mid)' }}>电网</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'Orbitron, monospace', color: '#0088ff', fontWeight: 600 }}>{gridPower.toFixed(1)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', padding: '4px', background: 'rgba(255,204,68,0.06)', borderRadius: '3px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ffcc44' }}></span>
                  <span style={{ color: 'var(--text-mid)' }}>光伏</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'Orbitron, monospace', color: '#ffcc44', fontWeight: 600 }}>{pvOutput.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>未来收益潜力池</div>
            <canvas ref={funnelRef} width={200} height={110} style={{ width: '100%', height: '110px' }}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}
