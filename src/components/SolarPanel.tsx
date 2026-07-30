'use client';
import { useEffect, useRef } from 'react';

interface SolarPanelProps { kpiPower: string; }

function setupHiDPI(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = '100%'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d')!; ctx.scale(dpr, dpr);
  return ctx;
}

export default function SolarPanel({ kpiPower }: SolarPanelProps) {
  const pvOutput = 32.5;
  const pvCapacity = 50;
  const pvSelfRate = ((pvOutput / (pvOutput + 18.6 + parseFloat(kpiPower || '0'))) * 100).toFixed(1);
  const dailyGen = pvOutput * 8;
  const carbonReduce = pvOutput * 0.5810;
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };

  const trendRef = useRef<HTMLCanvasElement>(null);     // 24h 发电趋势
  const gaugeRef = useRef<HTMLCanvasElement>(null);     // 逆变器效率仪表盘
  const costRef = useRef<HTMLCanvasElement>(null);      // 度电成本对比
  const irrRef = useRef<HTMLCanvasElement>(null);       // 各区域辐照度
  const healthRef = useRef<HTMLCanvasElement>(null);    // 资产健康环

  // 24h 发电趋势（带填充 + 峰值标记）
  useEffect(() => {
    const c = trendRef.current; if (!c) return;
    const W = 320, H = 130, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    // 网格
    ctx.strokeStyle = 'rgba(0,255,136,0.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, H / 4 * i); ctx.lineTo(W, H / 4 * i); ctx.stroke(); }
    // 曲线点：6:00-18:00 钟形
    const pts: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const x = i / 24 * W;
      let v = 0;
      if (i >= 6 && i <= 18) {
        const t = (i - 6) / 12;
        v = Math.sin(t * Math.PI) * 48 * (0.95 + Math.sin(i) * 0.05);
      }
      const y = H - 14 - v / 60 * (H - 18);
      pts.push([x, y]);
    }
    // 填充
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,255,136,0.45)'); grad.addColorStop(1, 'rgba(0,255,136,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(pts[0][0], H); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // 折线
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 6;
    ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])); ctx.stroke();
    ctx.shadowBlur = 0;
    // 当前点 (16:00)
    const nowIdx = 16;
    ctx.fillStyle = '#00ffcc'; ctx.beginPath(); ctx.arc(pts[nowIdx][0], pts[nowIdx][1], 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(pts[nowIdx][0], pts[nowIdx][1], 8, 0, Math.PI * 2); ctx.stroke();
    // 峰值标记 (12:00)
    const peakIdx = 12;
    ctx.fillStyle = '#ffcc44'; ctx.beginPath(); ctx.arc(pts[peakIdx][0], pts[peakIdx][1], 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcc44'; ctx.font = '9px Orbitron'; ctx.textAlign = 'center';
    ctx.fillText('峰值 48.2kW', pts[peakIdx][0], pts[peakIdx][1] - 8);
    // x 轴
    ctx.fillStyle = '#4a6485'; ctx.font = '8px Rajdhani';
    [0, 6, 12, 18, 24].forEach(h => ctx.fillText(h + ':00', h / 24 * W, H - 2));
    // y 轴单位
    ctx.fillStyle = '#4a6485'; ctx.font = '8px Rajdhani'; ctx.textAlign = 'left';
    ctx.fillText('kW', 2, 10);
  }, []);

  // 逆变器效率仪表盘
  useEffect(() => {
    const c = gaugeRef.current; if (!c) return;
    const W = 140, H = 140, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2 + 6, R = 50;
    const eff = 96.2;
    // 背景弧
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,255,136,0.1)';
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI * 0.75, Math.PI * 0.25); ctx.stroke();
    // 刻度
    ctx.strokeStyle = 'rgba(138,165,196,0.3)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (Math.PI * 1.5) * (i / 10);
      const x1 = cx + Math.cos(a) * (R + 6), y1 = cy + Math.sin(a) * (R + 6);
      const x2 = cx + Math.cos(a) * (R + 10), y2 = cy + Math.sin(a) * (R + 10);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // 值弧
    const endAng = Math.PI * 0.75 + (Math.PI * 1.5) * (eff / 100);
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#00ff88'); grad.addColorStop(1, '#00ffcc');
    ctx.strokeStyle = grad; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI * 0.75, endAng); ctx.stroke();
    ctx.shadowBlur = 0;
    // 中央
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 22px Orbitron'; ctx.textAlign = 'center';
    ctx.fillText(eff.toFixed(1) + '%', cx, cy + 2);
    ctx.fillStyle = '#4a6485'; ctx.font = '9px Rajdhani';
    ctx.fillText('逆变器效率', cx, cy + 16);
  }, []);

  // 资产健康环（多环组合）
  useEffect(() => {
    const c = healthRef.current; if (!c) return;
    const W = 130, H = 130, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const rings = [
      { r: 50, v: 96.2, col: '#00ff88', lbl: '效率' },
      { r: 40, v: 88, col: '#00d4ff', lbl: '清洁' },
      { r: 30, v: 100, col: '#ffcc44', lbl: '在线' },
    ];
    rings.forEach(ring => {
      // 背景环
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,212,255,0.08)';
      ctx.beginPath(); ctx.arc(cx, cy, ring.r, 0, Math.PI * 2); ctx.stroke();
      // 值环
      ctx.strokeStyle = ring.col; ctx.lineCap = 'round';
      ctx.shadowColor = ring.col; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(cx, cy, ring.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (ring.v / 100)); ctx.stroke();
      ctx.shadowBlur = 0;
    });
    // 中央
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 18px Orbitron'; ctx.textAlign = 'center';
    ctx.fillText('96.2%', cx, cy + 2);
    ctx.fillStyle = '#4a6485'; ctx.font = '9px Rajdhani';
    ctx.fillText('综合健康度', cx, cy + 16);
  }, []);

  // 度电成本对比柱状图
  useEffect(() => {
    const c = costRef.current; if (!c) return;
    const W = 240, H = 110, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const data = [
      { n: '电网购电', v: 78, col: '#0088ff' },
      { n: '光伏自用', v: 52, col: '#00ff88' },
      { n: '储能放电', v: 61, col: '#ffcc44' },
    ];
    const mx = 100, bw = W / data.length * 0.55;
    // 网格
    ctx.strokeStyle = 'rgba(0,212,255,0.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, H - 18 - (H - 22) / 4 * i); ctx.lineTo(W, H - 18 - (H - 22) / 4 * i); ctx.stroke(); }
    data.forEach((d, i) => {
      const x = i * (W / data.length) + (W / data.length - bw) / 2;
      const h = d.v / mx * (H - 22);
      const g = ctx.createLinearGradient(0, H - 18 - h, 0, H - 18);
      g.addColorStop(0, d.col); g.addColorStop(1, d.col + '20');
      ctx.fillStyle = g; ctx.shadowColor = d.col; ctx.shadowBlur = 6;
      ctx.fillRect(x, H - 18 - h, bw, h); ctx.shadowBlur = 0;
      // 顶部值
      ctx.fillStyle = d.col; ctx.font = 'bold 11px Orbitron'; ctx.textAlign = 'center';
      ctx.fillText(d.v + '分', x + bw / 2, H - 18 - h - 4);
      // 标签
      ctx.fillStyle = '#8aa5c4'; ctx.font = '10px Rajdhani';
      ctx.fillText(d.n, x + bw / 2, H - 6);
    });
    // 节约指数
    ctx.fillStyle = '#00ff88'; ctx.font = 'bold 10px Orbitron'; ctx.textAlign = 'right';
    ctx.fillText('节约 +33.3%', W - 4, 12);
  }, []);

  // 各区域辐照度条形图
  useEffect(() => {
    const c = irrRef.current; if (!c) return;
    const W = 240, H = 110, ctx = setupHiDPI(c, W, H);
    ctx.clearRect(0, 0, W, H);
    const data = [
      { z: '屋顶东', v: 820, col: '#ffcc44' },
      { z: '屋顶西', v: 780, col: '#ffaa44' },
      { z: '车棚', v: 650, col: '#ff8844' },
      { z: '地面', v: 590, col: '#ff6644' },
    ];
    const mx = 1000, barH = (H - 4) / data.length - 4;
    data.forEach((d, i) => {
      const y = i * (barH + 4) + 2;
      const w = d.v / mx * (W - 70);
      // 背景
      ctx.fillStyle = 'rgba(255,204,68,0.05)';
      ctx.fillRect(55, y, W - 70, barH);
      // 实际值
      const g = ctx.createLinearGradient(55, 0, 55 + w, 0);
      g.addColorStop(0, d.col + '60'); g.addColorStop(1, d.col);
      ctx.fillStyle = g; ctx.shadowColor = d.col; ctx.shadowBlur = 4;
      ctx.fillRect(55, y, w, barH); ctx.shadowBlur = 0;
      // 边框
      ctx.strokeStyle = d.col + '60'; ctx.lineWidth = 1; ctx.strokeRect(55, y, w, barH);
      // 标签
      ctx.fillStyle = '#8aa5c4'; ctx.font = '10px Rajdhani'; ctx.textAlign = 'right';
      ctx.fillText(d.z, 50, y + barH / 2 + 3);
      // 数值
      ctx.fillStyle = d.col; ctx.font = 'bold 10px Orbitron'; ctx.textAlign = 'left';
      ctx.fillText(d.v + ' W/m²', 60 + w, y + barH / 2 + 3);
    });
  }, []);

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40, overflow: 'hidden' }}>
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
          <div className="panel" style={{ ...panelStyle, textAlign: 'center' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>资产健康度</div>
            <canvas ref={healthRef} width={130} height={130} style={{ width: '130px', height: '130px', display: 'block', margin: '0 auto' }}></canvas>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
              <div style={{ padding: '5px', background: 'rgba(0,255,136,0.06)', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>面板清洁度</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', color: 'var(--success)', fontWeight: 600 }}>88%</div>
              </div>
              <div style={{ padding: '5px', background: 'rgba(0,212,255,0.06)', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>逆变器在线率</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', color: 'var(--primary)', fontWeight: 600 }}>100%</div>
              </div>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>故障预警分布</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>24小时发电功率趋势</div>
            <canvas ref={trendRef} width={320} height={130} style={{ width: '100%', height: '130px' }}></canvas>
            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>当前功率 <span style={{ color: 'var(--success)', fontFamily: 'Orbitron, monospace' }}>{pvOutput} kW</span></span>
              <span>峰值 <span style={{ color: 'var(--warn)', fontFamily: 'Orbitron, monospace' }}>48.2 kW</span></span>
              <span>日照 <span style={{ color: 'var(--primary)', fontFamily: 'Orbitron, monospace' }}>8.2h</span></span>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>☀ 各区域辐照度</div>
            <canvas ref={irrRef} width={240} height={110} style={{ width: '100%', height: '110px' }}></canvas>
          </div>
        </div>

        {/* 右侧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, textAlign: 'center' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>逆变器效率</div>
            <canvas ref={gaugeRef} width={140} height={140} style={{ width: '120px', height: '120px', display: 'block', margin: '0 auto' }}></canvas>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '6px', letterSpacing: '1px' }}>度电成本对比</div>
            <canvas ref={costRef} width={240} height={110} style={{ width: '100%', height: '110px' }}></canvas>
            <div style={{ marginTop: '6px', padding: '6px', background: 'rgba(0,255,136,0.06)', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>年成本节约指数</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: 'var(--success)', textShadow: '0 0 10px rgba(0,255,136,0.4)' }}>+33.3%</div>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
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
