'use client';
interface CarbonPanelProps { kpiPower: string; }
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '10px', letterSpacing: '1px' }}>排放源构成 (Scope)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'conic-gradient(#00d4ff 306deg, #ffcc44 29deg, #ff8844 25deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#02070f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px', color: '#00ffcc', fontWeight: 700 }}>{hourlyCarbon.toFixed(1)}</span>
                  <span style={{ fontSize: '8px', color: '#4a6485' }}>kg/h</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { label: 'Scope 2 电力', pct: 85, color: '#00d4ff' },
                  { label: 'Scope 1 直排', pct: 8, color: '#ffcc44' },
                  { label: 'Scope 3 间接', pct: 7, color: '#ff8844' },
                ].map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color }}></span>
                    <span style={{ color: 'var(--text-mid)' }}>{d.label}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'Orbitron, monospace', color: d.color, fontWeight: 600 }}>{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>重点排放源 (kgCO₂/h)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {[
                { label: '楼宇空调', val: power * 0.6 * carbonFactor, color: '#0088ff' },
                { label: '楼宇照明', val: power * 0.4 * carbonFactor, color: '#00d4ff' },
                { label: '充电桩', val: 18.6 * carbonFactor, color: '#00ff88' },
                { label: '其他', val: 3.2 * carbonFactor, color: '#ff8844' },
              ].map((d, i) => {
                const maxVal = power * 0.6 * carbonFactor;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-mid)', width: '60px' }}>{d.label}</span>
                    <div style={{ flex: 1, height: '12px', background: 'rgba(0,212,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${d.val/maxVal*100}%`, background: d.color, boxShadow: `0 0 4px ${d.color}` }}></div>
                    </div>
                    <span style={{ color: d.color, fontFamily: 'Orbitron, monospace', width: '50px', textAlign: 'right' }}>{d.val.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, letterSpacing: '1px' }}>近12月碳排放趋势 (tCO₂)</span>
              <span style={{ fontSize: '10px', color: 'var(--success)' }}>同比 ⬇️ 14.3%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '160px' }}>
              {['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'].map((m, i) => {
                const val = (hourlyCarbon * 24 * 30 / 1000) * (0.8 + Math.sin(i/2) * 0.15);
                const lastVal = val * 1.17;
                const maxVal = (hourlyCarbon * 24 * 30 / 1000) * 1.2;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ width: '60%', height: `${lastVal/maxVal*100}%`, background: 'rgba(138,165,196,0.15)', borderRadius: '2px 2px 0 0' }}></div>
                    <div style={{ width: '60%', height: `${val/maxVal*100}%`, background: 'linear-gradient(180deg, #00ffcc, rgba(0,255,204,0.2))', borderRadius: '2px 2px 0 0', boxShadow: '0 0 4px rgba(0,255,204,0.3)', marginTop: '-2px' }}></div>
                    <div style={{ fontSize: '8px', color: 'var(--text-dim)', marginTop: '3px' }}>{m}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginBottom: '10px', letterSpacing: '1px' }}>🌱 绿色贡献与价值转化</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, textAlign: 'center' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>碳中和进度</div>
            <div style={{ width: '140px', height: '140px', margin: '0 auto', borderRadius: '50%', background: `conic-gradient(from -90deg, #00ff88, #00ffcc, #00d4ff ${pct*360}deg, rgba(0,255,204,0.08) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: '#02070f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', color: '#00ffcc', fontWeight: 700 }}>{(pct*100).toFixed(1)}%</span>
                <span style={{ fontSize: '9px', color: '#8aa5c4' }}>配额使用率</span>
              </div>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '6px' }}>{usedQuota.toFixed(0)} / {annualQuota} kg</div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '10px', letterSpacing: '1px' }}>📋 碳资产管理</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: '碳配额余额', val: (annualQuota - usedQuota).toFixed(0) + ' kg', color: 'var(--primary)' },
                { label: 'CCER余额', val: '1,250 tCO₂', color: 'var(--cyan-glow)' },
                { label: '碳信用评级', val: 'AA', color: 'var(--success)' },
                { label: '履约状态', val: '✓ 达标', color: 'var(--success)' },
                { label: '下次核查', val: '2026-12-31', color: 'var(--text-mid)' },
              ].map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,204,68,0.04)', borderRadius: '3px', borderLeft: '2px solid ' + d.color }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-mid)' }}>{d.label}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '13px', color: d.color, fontWeight: 600 }}>{d.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
