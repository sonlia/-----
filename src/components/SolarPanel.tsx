'use client';
interface SolarPanelProps { kpiPower: string; }
export default function SolarPanel({ kpiPower }: SolarPanelProps) {
  const pvOutput = 32.5;
  const pvCapacity = 50;
  const pvSelfRate = ((pvOutput / (pvOutput + 18.6 + parseFloat(kpiPower || '0'))) * 100).toFixed(1);
  const dailyGen = pvOutput * 8;
  const carbonReduce = pvOutput * 0.5810;
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, textAlign: 'center' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>资产健康度</div>
            <div style={{ width: '120px', height: '120px', margin: '0 auto', borderRadius: '50%', background: 'conic-gradient(#00ff88 346deg, rgba(0,255,136,0.1) 0deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#02070f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', color: '#00ff88', fontWeight: 700 }}>96.2%</span>
                <span style={{ fontSize: '10px', color: '#8aa5c4' }}>逆变器效率</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
              <div style={{ padding: '6px', background: 'rgba(0,255,136,0.06)', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>面板清洁度</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', color: 'var(--success)', fontWeight: 600 }}>88%</div>
              </div>
              <div style={{ padding: '6px', background: 'rgba(0,212,255,0.06)', borderRadius: '4px' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '10px', letterSpacing: '1px' }}>24小时发电功率趋势</div>
            <div style={{ position: 'relative', height: '140px', background: 'radial-gradient(ellipse at center, rgba(0,255,136,0.04) 0%, transparent 70%)', borderRadius: '6px' }}>
              <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 400 140" preserveAspectRatio="none">
                <defs><linearGradient id="pvgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(0,255,136,0.3)" /><stop offset="100%" stopColor="rgba(0,255,136,0)" /></linearGradient></defs>
                <path d="M 0,135 L 0,135 Q 50,135 100,50 Q 150,10 200,10 Q 250,10 300,50 Q 350,135 400,135 Z" fill="url(#pvgrad)" />
                <path d="M 0,135 Q 50,135 100,50 Q 150,10 200,10 Q 250,10 300,50 Q 350,135 400,135" fill="none" stroke="#00ff88" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 4px #00ff88)' }} />
              </svg>
              <div style={{ position: 'absolute', bottom: '2px', left: '0', right: '0', display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: '9px', color: 'var(--text-dim)' }}>
                <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
              </div>
              <div style={{ position: 'absolute', top: '4px', right: '8px', fontFamily: 'Orbitron, monospace', fontSize: '10px', color: '#00ff88' }}>{pvOutput} kW</div>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>当前功率 <span style={{ color: 'var(--success)', fontFamily: 'Orbitron, monospace' }}>{pvOutput} kW</span></span>
              <span>峰值 <span style={{ color: 'var(--warn)', fontFamily: 'Orbitron, monospace' }}>48.2 kW</span></span>
              <span>日照 <span style={{ color: 'var(--primary)', fontFamily: 'Orbitron, monospace' }}>8.2h</span></span>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>☀ 各区域辐照度</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {[
                { zone: '屋顶东侧', irr: 820, color: '#ffcc44' },
                { zone: '屋顶西侧', irr: 780, color: '#ffaa44' },
                { zone: '车棚', irr: 650, color: '#ff8844' },
                { zone: '地面', irr: 590, color: '#ff6644' },
              ].map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-mid)', width: '60px' }}>{d.zone}</span>
                  <div style={{ flex: 1, height: '12px', background: 'rgba(255,204,68,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.irr/1000*100}%`, background: d.color, boxShadow: `0 0 4px ${d.color}` }}></div>
                  </div>
                  <span style={{ color: d.color, fontFamily: 'Orbitron, monospace', width: '60px', textAlign: 'right' }}>{d.irr} W/m²</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '10px', letterSpacing: '1px' }}>度电成本优势</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: '电网购电', val: 78, color: '#0088ff' },
                { label: '光伏自用', val: 52, color: '#00ff88' },
                { label: '储能放电', val: 61, color: '#ffcc44' },
              ].map((d, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '3px' }}>
                    <span>{d.label}</span><span style={{ color: d.color, fontFamily: 'Orbitron, monospace' }}>{d.val}</span>
                  </div>
                  <div style={{ height: '12px', background: 'rgba(0,212,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.val}%`, background: d.color, boxShadow: `0 0 4px ${d.color}` }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,255,136,0.06)', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>年成本节约指数</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, color: 'var(--success)', textShadow: '0 0 10px rgba(0,255,136,0.4)' }}>+33.3%</div>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>🌱 环保价值</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                { label: '等效植树', val: Math.round(carbonReduce * 24 / 5.8), unit: '棵/日', color: '#00ffcc' },
                { label: '节约标煤', val: (dailyGen * 0.328).toFixed(1), unit: 'kg/日', color: '#00ff88' },
                { label: 'SO₂减排', val: (dailyGen * 0.0028).toFixed(2), unit: 'kg/日', color: '#00d4ff' },
                { label: 'NOx减排', val: (dailyGen * 0.0015).toFixed(2), unit: 'kg/日', color: '#ffcc44' },
              ].map((d, i) => (
                <div key={i} style={{ padding: '8px', background: `${d.color}0d`, borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{d.label}</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '16px', color: d.color, fontWeight: 700 }}>{d.val}</div>
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
