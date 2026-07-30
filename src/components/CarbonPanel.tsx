'use client';
import { useEffect, useRef } from 'react';

interface CarbonPanelProps { kpiPower: string; }

function setupHiDPI(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = '100%'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d')!; ctx.scale(dpr, dpr);
  return ctx;
}

export default function CarbonPanel({ kpiPower }: CarbonPanelProps) {
  const power = parseFloat(kpiPower || '0');
  const totalLoad = power + 18.6;
  const carbonFactor = 0.5810;
  const hourlyCarbon = totalLoad * carbonFactor;
  const annualQuota = 2800;
  const usedQuota = totalLoad * carbonFactor * 24 * 365 * 0.32;
  const pct = usedQuota / annualQuota;
  const riskLevel = pct < 0.6 ? { label: '低风险', color: '#00ff88' } : pct < 0.85 ? { label: '中风险', color: '#ffcc44' } : { label: '高风险', color: '#ff4d6d' };
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };

  const pieRef = useRef<HTMLCanvasElement>(null);      // Scope 饼图
  const barRef = useRef<HTMLCanvasElement>(null);      // 12 月趋势
  const progRef = useRef<HTMLCanvasElement>(null);     // 碳中和进度环
  const srcRef = useRef<HTMLCanvasElement>(null);      // 排放源条形图

  // Scope 饼图
  useEffect(() => {
    const c = pieRef.current; if (!c) return;
    const W = 130, H = 130, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = 48;
    const slices = [
      { v: 85, col: '#00d4ff', lbl: 'Scope2' },
      { v: 8, col: '#ffcc44', lbl: 'Scope1' },
      { v: 7, col: '#ff8844', lbl: 'Scope3' },
    ];
    let start = -Math.PI / 2;
    slices.forEach(s => {
      const ang = (s.v / 100) * Math.PI * 2;
      ctx.fillStyle = s.col; ctx.shadowColor = s.col; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, start + ang); ctx.closePath(); ctx.fill();
      start += ang;
    });
    ctx.shadowBlur = 0;
    // 镂空
    ctx.fillStyle = '#02070f'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.6, 0, Math.PI * 2); ctx.fill();
    // 中央
    ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 16px Orbitron'; ctx.textAlign = 'center';
    ctx.fillText(hourlyCarbon.toFixed(1), cx, cy);
    ctx.fillStyle = '#4a6485'; ctx.font = '8px Rajdhani';
    ctx.fillText('kg/h', cx, cy + 12);
  }, [hourlyCarbon]);

  // 12 月趋势柱状图（去年 vs 今年）
  useEffect(() => {
    const c = barRef.current; if (!c) return;
    const W = 340, H = 160, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const baseVal = hourlyCarbon * 24 * 30 / 1000;
    const data = months.map((_, i) => baseVal * (0.85 + Math.sin(i / 2) * 0.15));
    const lastYear = data.map(v => v * 1.17);
    const mx = Math.max(...lastYear) * 1.15;
    // 网格
    ctx.strokeStyle = 'rgba(0,255,204,0.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, H - 20 - (H - 24) / 4 * i); ctx.lineTo(W, H - 20 - (H - 24) / 4 * i); ctx.stroke(); }
    const bw = W / months.length * 0.32;
    months.forEach((m, i) => {
      const x = i * (W / months.length) + (W / months.length - bw * 2) / 2;
      // 去年（浅色）
      const hLast = lastYear[i] / mx * (H - 24);
      ctx.fillStyle = 'rgba(138,165,196,0.18)';
      ctx.fillRect(x, H - 20 - hLast, bw, hLast);
      // 今年（实色 + 渐变）
      const hNow = data[i] / mx * (H - 24);
      const g = ctx.createLinearGradient(0, H - 20 - hNow, 0, H - 20);
      g.addColorStop(0, '#00ffcc'); g.addColorStop(1, 'rgba(0,255,204,0.2)');
      ctx.fillStyle = g; ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 4;
      ctx.fillRect(x + bw + 2, H - 20 - hNow, bw, hNow); ctx.shadowBlur = 0;
      // 标签
      ctx.fillStyle = '#4a6485'; ctx.font = '8px Rajdhani'; ctx.textAlign = 'center';
      ctx.fillText(m, x + bw + 1, H - 6);
    });
    // 图例
    ctx.font = '9px Rajdhani'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(138,165,196,0.5)'; ctx.fillRect(4, 4, 8, 6);
    ctx.fillStyle = '#8aa5c4'; ctx.fillText('去年', 16, 10);
    ctx.fillStyle = '#00ffcc'; ctx.fillRect(50, 4, 8, 6);
    ctx.fillStyle = '#e8f4ff'; ctx.fillText('今年', 62, 10);
    // 同比下降
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 9px Orbitron'; ctx.textAlign = 'right';
    ctx.fillText('⬇ 14.3%', W - 4, 10);
  }, [hourlyCarbon]);

  // 碳中和进度环（双层环 + 中央百分比）
  useEffect(() => {
    const c = progRef.current; if (!c) return;
    const W = 150, H = 150, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = 56;
    // 外环背景
    ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,255,204,0.08)';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    // 外环值（渐变 + 阴影）
    const grad = ctx.createConicGradient(-Math.PI / 2, cx, cy);
    grad.addColorStop(0, '#00ff88');
    grad.addColorStop(0.5, '#00ffcc');
    grad.addColorStop(1, '#00d4ff');
    ctx.strokeStyle = grad; ctx.lineCap = 'round';
    ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct); ctx.stroke();
    ctx.shadowBlur = 0;
    // 内环（CCER 抵消 25%）
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,204,68,0.1)';
    ctx.beginPath(); ctx.arc(cx, cy, R - 14, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffcc44';
    ctx.beginPath(); ctx.arc(cx, cy, R - 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.25); ctx.stroke();
    // 中央百分比
    ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 22px Orbitron'; ctx.textAlign = 'center';
    ctx.fillText((pct * 100).toFixed(1) + '%', cx, cy + 2);
    ctx.fillStyle = '#4a6485'; ctx.font = '9px Rajdhani';
    ctx.fillText('配额使用', cx, cy + 16);
    // 刻度
    ctx.strokeStyle = 'rgba(138,165,196,0.3)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 + (Math.PI * 2) * (i / 10);
      const x1 = cx + Math.cos(a) * (R + 6), y1 = cy + Math.sin(a) * (R + 6);
      const x2 = cx + Math.cos(a) * (R + 10), y2 = cy + Math.sin(a) * (R + 10);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  }, [pct]);

  // 重点排放源条形图
  useEffect(() => {
    const c = srcRef.current; if (!c) return;
    const W = 240, H = 110, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const data = [
      { n: '楼宇空调', v: power * 0.6 * carbonFactor, col: '#0088ff' },
      { n: '楼宇照明', v: power * 0.4 * carbonFactor, col: '#00d4ff' },
      { n: '充电桩', v: 18.6 * carbonFactor, col: '#00ff88' },
      { n: '其他', v: 3.2 * carbonFactor, col: '#ff8844' },
    ];
    const mx = Math.max(...data.map(d => d.v)) * 1.15;
    const barH = (H - 4) / data.length - 4;
    data.forEach((d, i) => {
      const y = i * (barH + 4) + 2;
      const w = d.v / mx * (W - 90);
      // 背景
      ctx.fillStyle = 'rgba(0,212,255,0.05)';
      ctx.fillRect(60, y, W - 70, barH);
      // 实际值
      const g = ctx.createLinearGradient(60, 0, 60 + w, 0);
      g.addColorStop(0, d.col + '60'); g.addColorStop(1, d.col);
      ctx.fillStyle = g; ctx.shadowColor = d.col; ctx.shadowBlur = 4;
      ctx.fillRect(60, y, w, barH); ctx.shadowBlur = 0;
      ctx.strokeStyle = d.col + '60'; ctx.lineWidth = 1; ctx.strokeRect(60, y, w, barH);
      // 标签
      ctx.fillStyle = '#8aa5c4'; ctx.font = '10px Rajdhani'; ctx.textAlign = 'right';
      ctx.fillText(d.n, 55, y + barH / 2 + 3);
      // 数值
      ctx.fillStyle = d.col; ctx.font = 'bold 10px Orbitron'; ctx.textAlign = 'left';
      ctx.fillText(d.v.toFixed(2), 65 + w, y + barH / 2 + 3);
    });
    // 单位
    ctx.fillStyle = '#4a6485'; ctx.font = '8px Rajdhani'; ctx.textAlign = 'right';
    ctx.fillText('kgCO₂/h', W - 2, H - 1);
  }, [power]);

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
        {[
          { label: '实时碳排放强度', value: hourlyCarbon.toFixed(2), unit: 'kgCO₂/h', sub: '因子 0.581', color: '#00ffcc', icon: '📊' },
          { label: '年度配额使用率', value: (pct * 100).toFixed(1), unit: '%', sub: '剩余 ' + (annualQuota - usedQuota).toFixed(0) + ' kg', color: '#00d4ff', icon: '⚖' },
          { label: '碳履约风险等级', value: riskLevel.label, unit: '', sub: '基于配额消耗', color: riskLevel.color, icon: '🛡' },
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
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>排放源构成 (Scope)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <canvas ref={pieRef} width={130} height={130} style={{ width: '110px', height: '110px', flexShrink: 0 }}></canvas>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { label: 'Scope 2 电力', pct: 85, color: '#00d4ff' },
                  { label: 'Scope 1 直排', pct: 8, color: '#ffcc44' },
                  { label: 'Scope 3 间接', pct: 7, color: '#ff8844' },
                ].map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color, boxShadow: `0 0 4px ${d.color}` }}></span>
                    <span style={{ color: 'var(--text-mid)' }}>{d.label}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'Orbitron, monospace', color: d.color, fontWeight: 600 }}>{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>重点排放源</div>
            <canvas ref={srcRef} width={240} height={110} style={{ width: '100%', height: '110px' }}></canvas>
          </div>
        </div>

        {/* 中间 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, letterSpacing: '1px' }}>近12月碳排放趋势 (tCO₂)</span>
              <span style={{ fontSize: '10px', color: 'var(--success)' }}>同比 ⬇️ 14.3%</span>
            </div>
            <canvas ref={barRef} width={340} height={160} style={{ width: '100%', height: '160px' }}></canvas>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>🌱 绿色贡献与价值转化</div>
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
          <div className="panel" style={{ ...panelStyle, textAlign: 'center' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>碳中和进度</div>
            <canvas ref={progRef} width={150} height={150} style={{ width: '140px', height: '140px', display: 'block', margin: '0 auto' }}></canvas>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>{usedQuota.toFixed(0)} / {annualQuota} kg · CCER抵消 25%</div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>📋 碳资产管理</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: '碳配额余额', val: (annualQuota - usedQuota).toFixed(0) + ' kg', color: 'var(--primary)' },
                { label: 'CCER余额', val: '1,250 tCO₂', color: 'var(--cyan-glow)' },
                { label: '碳信用评级', val: 'AA', color: 'var(--success)' },
                { label: '履约状态', val: '✓ 达标', color: 'var(--success)' },
                { label: '下次核查', val: '2026-12-31', color: 'var(--text-mid)' },
              ].map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: 'rgba(255,204,68,0.04)', borderRadius: '3px', borderLeft: '2px solid ' + d.color }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-mid)' }}>{d.label}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px', color: d.color, fontWeight: 600 }}>{d.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
