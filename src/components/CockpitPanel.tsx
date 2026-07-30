'use client';
import { useEffect, useRef } from 'react';

interface CockpitPanelProps { kpiPower: string; lightingOn: boolean; acOn: boolean; }

export default function CockpitPanel({ kpiPower, lightingOn, acOn }: CockpitPanelProps) {
  const power = parseFloat(kpiPower || '0');
  const totalLoad = power + 18.6;
  const pvOutput = 32.5;
  const gridPower = Math.max(0, totalLoad - pvOutput);
  const pvSelfRate = pvOutput > 0 ? (Math.min(pvOutput, totalLoad * 0.3) / pvOutput * 100) : 0;
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };
  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40, overflow: 'hidden' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '10px', letterSpacing: '1px' }}>配网负荷监控</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { name: 'I段母线', load: 38.5, cap: 60, color: '#00d4ff' },
                { name: 'II段母线', load: 25.2, cap: 50, color: '#00ffcc' },
                { name: 'III段母线', load: 18.6, cap: 40, color: '#ffcc44' },
                { name: '光伏母线', load: pvOutput, cap: 50, color: '#ff8844' },
              ].map((b, i) => {
                const pct = b.load / b.cap;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-mid)', width: '60px' }}>{b.name}</span>
                    <div style={{ flex: 1, height: '14px', background: 'rgba(0,212,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct*100}%`, background: b.color, boxShadow: `0 0 6px ${b.color}` }}></div>
                    </div>
                    <span style={{ color: b.color, fontFamily: 'Orbitron, monospace', width: '70px', textAlign: 'right' }}>{b.load.toFixed(1)}/{b.cap}kW</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '10px', letterSpacing: '1px' }}>供电构成</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(#0088ff ${gridPower/totalLoad*360}deg, #ffcc44 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#02070f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', color: '#e8f4ff', fontWeight: 700 }}>{totalLoad.toFixed(0)}</span>
                  <span style={{ fontSize: '9px', color: '#4a6485' }}>kW</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'rgba(0,136,255,0.06)', borderRadius: '4px', borderLeft: '2px solid #0088ff' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0088ff', flexShrink: 0 }}></span>
                  <span style={{ fontSize: '11px', color: 'var(--text-mid)' }}>电网供电</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#0088ff', fontWeight: 600 }}>{gridPower.toFixed(1)}<span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>kW</span></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'rgba(255,204,68,0.06)', borderRadius: '4px', borderLeft: '2px solid #ffcc44' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffcc44', flexShrink: 0 }}></span>
                  <span style={{ fontSize: '11px', color: 'var(--text-mid)' }}>光伏发电</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'Orbitron, monospace', fontSize: '14px', color: '#ffcc44', fontWeight: 600 }}>{pvOutput.toFixed(1)}<span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>kW</span></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'rgba(0,255,136,0.06)', borderRadius: '4px', borderLeft: '2px solid var(--success)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }}></span>
                  <span style={{ fontSize: '11px', color: 'var(--text-mid)' }}>新能源占比</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'Orbitron, monospace', fontSize: '14px', color: 'var(--success)', fontWeight: 600 }}>{(pvOutput / (totalLoad || 1) * 100).toFixed(1)}<span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>%</span></span>
                </div>
              </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '10px', letterSpacing: '1px' }}>负荷响应能力</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: '可调节负荷占比', val: 35.2, color: '#00d4ff' },
                { label: '负荷响应合格率', val: 92.5, color: '#00ffcc' },
                { label: '需求响应速率', val: 78.0, color: '#ffcc44' },
              ].map((d, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '3px' }}>
                    <span>{d.label}</span><span style={{ color: d.color, fontFamily: 'Orbitron, monospace' }}>{d.val}%</span>
                  </div>
                  <div style={{ height: '14px', background: 'rgba(0,212,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.val}%`, background: d.color, boxShadow: `0 0 4px ${d.color}` }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '8px', textAlign: 'center', padding: '6px', background: 'rgba(0,255,136,0.06)', borderRadius: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>综合评分 </span>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '16px', color: 'var(--success)', fontWeight: 700 }}>68.6</span>
              <span style={{ fontSize: '10px', color: 'var(--success)', marginLeft: '4px' }}>等级 B</span>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>充电桩与储能协同</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ padding: '8px', background: 'rgba(0,255,136,0.06)', borderRadius: '4px', borderLeft: '2px solid var(--success)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>充电桩利用率</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '16px', color: 'var(--success)', fontWeight: 600 }}>66.7%</div>
              </div>
              <div style={{ padding: '8px', background: 'rgba(0,212,255,0.06)', borderRadius: '4px', borderLeft: '2px solid var(--primary)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>柔性调节能力</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '16px', color: 'var(--primary)', fontWeight: 600 }}>12.5 kW</div>
              </div>
            </div>
            <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-dim)' }}>
              储能：<span style={{ color: 'var(--success)' }}>● 充电中 SOC 68%</span>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>未来收益潜力池</div>
            {[
              { label: '总能耗基数', val: totalLoad, pct: 100, color: '#0088ff' },
              { label: '已实现节能', val: totalLoad * 0.25, pct: 75, color: '#00d4ff' },
              { label: '待挖掘潜力', val: totalLoad * 0.15, pct: 50, color: '#00ffcc' },
            ].map((l, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
                  <span>{l.label}</span><span style={{ color: l.color, fontFamily: 'Orbitron, monospace' }}>{l.val.toFixed(1)} kW ({l.pct}%)</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(0,212,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}>
                  <div style={{ height: '100%', width: `${l.pct}%`, background: l.color, boxShadow: `0 0 4px ${l.color}` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
