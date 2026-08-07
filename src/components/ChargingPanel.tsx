'use client';
import RegionTreeSelector from './RegionTreeSelector';
import { useMemo, useState } from 'react';
import EChart, { PALETTE, commonGrid, commonTooltip, commonAxis } from './EChart';
import ShenzhenMap from './ShenzhenMap';

interface ChargingPanelProps { kpiPower: string; }

export default function ChargingPanel({ kpiPower }: ChargingPanelProps) {
  const panelStyle: React.CSSProperties = { position: 'relative', padding: '14px 16px' };

  // 1. 月度充电量柱状图
  const barOption = useMemo(() => {
    const ms = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月'];
    const d = ms.map((_, i) => Math.round(2800 + Math.sin(i / 2) * 600 + Math.random() * 300));
    return {
      tooltip: { ...commonTooltip, trigger: 'axis', formatter: '{b}: {c} kWh' },
      grid: { ...commonGrid, left: 36, right: 12, top: 16, bottom: 22 },
      xAxis: { type: 'category', data: ms, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9 } },
      yAxis: { type: 'value', name: 'kWh', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [{
        type: 'bar', barWidth: 12,
        data: d.map(v => ({ value: v, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.primary }, { offset: 1, color: PALETTE.primary + '20' }] }, borderRadius: [4, 4, 0, 0] } })),
        label: { show: true, position: 'top', color: PALETTE.primary, fontSize: 9, fontFamily: 'Orbitron' },
      }],
    };
  }, []);

  // 2. 月度使用率柱状图
  const usageOption = useMemo(() => {
    const ms = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月'];
    const d = ms.map((_, i) => Math.round(45 + Math.sin(i / 3) * 12 + Math.random() * 8));
    return {
      tooltip: { ...commonTooltip, trigger: 'axis', formatter: '{b}: {c}%' },
      grid: { ...commonGrid, left: 36, right: 12, top: 16, bottom: 22 },
      xAxis: { type: 'category', data: ms, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9 } },
      yAxis: { type: 'value', max: 100, name: '%', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [{
        type: 'bar', barWidth: 12,
        data: d.map(v => ({ value: v, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.success }, { offset: 1, color: PALETTE.success + '20' }] }, borderRadius: [4, 4, 0, 0] } })),
        label: { show: true, position: 'top', formatter: '{c}%', color: PALETTE.success, fontSize: 9, fontFamily: 'Orbitron' },
        markLine: { symbol: 'none', lineStyle: { color: PALETTE.warn, type: 'dashed' }, data: [{ yAxis: 70, label: { formatter: '目标 70%', color: PALETTE.warn, fontSize: 9 } }] },
      }],
    };
  }, []);

  // 3. 充电桩状态分布饼图
  const statusOption = useMemo(() => ({
    tooltip: { ...commonTooltip, trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: 4, top: 'middle', textStyle: { color: PALETTE.textMid, fontSize: 10 }, itemWidth: 8, itemHeight: 8 },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      center: ['35%', '50%'],
      itemStyle: { borderColor: '#02070f', borderWidth: 2 },
      label: { color: PALETTE.textMain, fontSize: 11, fontFamily: 'Orbitron', formatter: '{c}' },
      data: [
        { value: 973, name: '充电中', itemStyle: { color: PALETTE.success } },
        { value: 386, name: '闲置', itemStyle: { color: PALETTE.primary } },
        { value: 78, name: '异常', itemStyle: { color: PALETTE.danger } },
        { value: 22, name: '未启用', itemStyle: { color: PALETTE.textDim } },
      ],
    }],
  }), []);

  // 4. 24h 充电功率趋势（堆叠：快充+慢充）
  const powerTrendOption = useMemo(() => {
    const hours = Array.from({ length: 25 }, (_, i) => i + ':00');
    const fast = hours.map((_, i) => {
      const base = 60 + 80 * Math.exp(-Math.pow((i - 14) / 5, 2));
      return Math.round(base + Math.random() * 20);
    });
    const slow = hours.map((_, i) => {
      const base = 30 + 40 * Math.exp(-Math.pow((i - 9) / 4, 2)) + 25 * Math.exp(-Math.pow((i - 19) / 3, 2));
      return Math.round(base + Math.random() * 10);
    });
    return {
      tooltip: { ...commonTooltip, trigger: 'axis' },
      legend: { data: ['快充', '慢充'], textStyle: { color: PALETTE.textMid, fontSize: 10 }, top: 0, right: 0, itemWidth: 10, itemHeight: 6 },
      grid: { ...commonGrid, left: 36, right: 12, top: 26, bottom: 22 },
      xAxis: { type: 'category', data: hours, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9, interval: 4 } },
      yAxis: { type: 'value', name: 'kW', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [
        { name: '快充', type: 'bar', stack: 'total', barWidth: 14, data: fast, itemStyle: { color: PALETTE.primary } },
        { name: '慢充', type: 'bar', stack: 'total', barWidth: 14, data: slow, itemStyle: { color: PALETTE.cyanGlow } },
      ],
    };
  }, []);

  // 5. 各区充电桩数量分布
  const regionOption = useMemo(() => {
    const regions = ['宝安', '光明', '南山', '龙华', '福田', '罗湖', '盐田', '龙岗', '坪山', '大鹏'];
    const counts = [180, 95, 220, 140, 185, 130, 75, 195, 145, 94];
    return {
      tooltip: { ...commonTooltip, trigger: 'axis', formatter: '{b}: {c} 桩' },
      grid: { ...commonGrid, left: 36, right: 12, top: 16, bottom: 36 },
      xAxis: { type: 'category', data: regions, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9, rotate: 30 } },
      yAxis: { type: 'value', name: '桩', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [{
        type: 'bar', barWidth: 14,
        data: counts.map(v => ({ value: v, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: PALETTE.cyanGlow }, { offset: 1, color: PALETTE.cyanGlow + '20' }] }, borderRadius: [4, 4, 0, 0] } })),
        label: { show: true, position: 'top', color: PALETTE.cyanGlow, fontSize: 9, fontFamily: 'Orbitron' },
      }],
    };
  }, []);

  // 6. 累计运营收益趋势（折线）
  const revenueOption = useMemo(() => {
    const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const data = months.map((_, i) => +(15 + i * 1.3 + Math.random() * 0.5).toFixed(1));
    return {
      tooltip: { ...commonTooltip, trigger: 'axis', formatter: '{b}: {c} 万元' },
      grid: { ...commonGrid, left: 36, right: 12, top: 16, bottom: 22 },
      xAxis: { type: 'category', data: months, ...commonAxis, axisLabel: { ...commonAxis.axisLabel, fontSize: 9 } },
      yAxis: { type: 'value', name: '万元', ...commonAxis, nameTextStyle: { color: PALETTE.textDim, fontSize: 9 } },
      series: [{
        type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data,
        lineStyle: { color: PALETTE.warn, width: 2.5, shadowColor: PALETTE.warn, shadowBlur: 6 },
        itemStyle: { color: PALETTE.warn, borderColor: '#02070f', borderWidth: 2 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,170,68,0.4)' }, { offset: 1, color: 'rgba(255,170,68,0)' }] } },
      }],
    };
  }, []);

  return (
    <div style={{ position: 'absolute', top: '120px', left: '20px', right: '20px', bottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 40, overflow: 'hidden' }}>
      <RegionTreeSelector />
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
        {[
          { l: '充电桩总数', v: '1,459', u: '个', c: '#00d4ff', i: '🔌' },
          { l: '日充电量', v: '4,283', u: 'kWh', c: '#00ffcc', i: '⚡' },
          { l: '日订单数', v: '326', u: '单', c: '#ffcc44', i: '📋' },
          { l: '充电桩利用率', v: '66.7', u: '%', c: '#00ff88', i: '📊' },
          { l: '场站总数', v: '48', u: '站', c: '#ff8844', i: '🏭' },
        ].map((k, i) => (
          <div key={i} className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>{k.i}</span>{k.l}
            </div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '28px', fontWeight: 700, color: k.c, textShadow: `0 0 12px ${k.c}40` }}>{k.v}<span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: '4px' }}>{k.u}</span></div>
          </div>
        ))}
      </div>

      {/* 三栏 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '10px', minHeight: 0 }}>
        {/* 左侧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>场站信息</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,212,255,0.06)', borderRadius: '4px' }}><div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>站点总数</div><div style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', color: 'var(--primary)', fontWeight: 700 }}>48</div></div>
              <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,255,136,0.06)', borderRadius: '4px' }}><div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>启用</div><div style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', color: 'var(--success)', fontWeight: 700 }}>42</div></div>
              <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,77,109,0.06)', borderRadius: '4px' }}><div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>禁用</div><div style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', color: 'var(--danger)', fontWeight: 700 }}>6</div></div>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>实时异常监控</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
              <div style={{ padding: '6px 8px', background: 'rgba(255,170,68,0.06)', borderRadius: '4px', borderLeft: '2px solid var(--warn)' }}><div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>掉线桩</div><div style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', color: 'var(--warn)', fontWeight: 600 }}>12</div></div>
              <div style={{ padding: '6px 8px', background: 'rgba(255,77,109,0.06)', borderRadius: '4px', borderLeft: '2px solid var(--danger)' }}><div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>故障桩</div><div style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', color: 'var(--danger)', fontWeight: 600 }}>5</div></div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', fontSize: '10px' }}>
              {[
                { t: '14:32', m: 'CP-038 通信超时，自动重连', c: '#ffaa44' },
                { t: '14:28', m: 'CP-127 急停按钮触发', c: '#ff4d6d' },
                { t: '14:15', m: 'CP-006 充电完成，结算正常', c: '#8aa5c4' },
                { t: '14:08', m: 'CP-091 温度预警 68°C', c: '#ffaa44' },
                { t: '13:55', m: 'CP-223 恢复在线', c: '#8aa5c4' },
                { t: '13:42', m: 'CP-015 CC2连接异常', c: '#ff4d6d' },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', padding: '3px 0', borderBottom: '1px solid rgba(0,212,255,0.05)' }}>
                  <span style={{ color: 'var(--text-dim)', fontFamily: 'Orbitron, monospace', flexShrink: 0 }}>{a.t}</span>
                  <span style={{ color: a.c }}>{a.m}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: '0 0 auto' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>月度充电量趋势 (kWh)</div>
            <EChart option={barOption} height={120} />
          </div>
        </div>

        {/* 中间 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, letterSpacing: '1px' }}>深圳站点分布</span>
              <div style={{ display: 'flex', gap: '10px', fontSize: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }}></span>充电中</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span>闲置</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 6px var(--danger)' }}></span>异常</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-dim)' }}></span>未启用</span>
              </div>
            </div>
            {/* 深圳真实地图（ECharts geo + 散点） */}
            <div style={{ flex: 1, minHeight: '180px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-line)', background: 'radial-gradient(ellipse at center, rgba(0,30,60,0.6) 0%, rgba(2,7,15,0.9) 70%)' }}>
              <ShenzhenMap height="100%" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>● 区域颜色深浅 = 充电桩数量</span>
              <span>● 鼠标悬停查看详情</span>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle, flex: '0 0 auto' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>24h 充电功率趋势 (快充+慢充堆叠)</div>
            <EChart option={powerTrendOption} height={140} />
          </div>
        </div>

        {/* 右侧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--warn)', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px' }}>💰 今日运营数据</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                { l: '订单数', v: '326', u: '单', c: 'var(--primary)' },
                { l: '充电量', v: '4,283', u: 'kWh', c: 'var(--cyan-glow)' },
                { l: '服务费', v: '2,056', u: '元', c: 'var(--warn)' },
                { l: '电费', v: '2,933', u: '元', c: 'var(--success)' },
              ].map((d, i) => (
                <div key={i} style={{ padding: '8px', background: `${d.c}0d`, borderRadius: '4px', borderLeft: `2px solid ${d.c}` }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{d.l}</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '16px', fontWeight: 700, color: d.c }}>{d.v}<span style={{ fontSize: '9px', color: 'var(--text-dim)', marginLeft: '2px' }}>{d.u}</span></div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,204,68,0.08)', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>今日总收益</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '24px', fontWeight: 700, color: 'var(--warn)', textShadow: '0 0 12px rgba(255,204,68,0.4)' }}>4,989<span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: '4px' }}>元</span></div>
            </div>
          </div>
          <div className="panel" style={{ ...panelStyle }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--cyan-glow)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>📈 累计运营收益 (万元)</div>
            <EChart option={revenueOption} height={130} />
          </div>
          <div className="panel" style={{ ...panelStyle, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <span className="panel-corner-tr"></span><span className="panel-corner-bl"></span>
            <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, marginBottom: '4px', letterSpacing: '1px' }}>月度使用率趋势 (%)</div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <EChart option={usageOption} height="100%" style={{ height: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
