'use client';
import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

interface EChartProps {
  option: any;
  height?: number | string;
  style?: React.CSSProperties;
}

// 统一 ECharts 包装器：科技暗色主题
export default function EChart({ option, height = 200, style }: EChartProps) {
  const theme = useMemo(() => ({
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'Rajdhani, Orbitron, sans-serif', color: '#8aa5c4' },
  }), []);

  const merged = useMemo(() => ({
    ...theme,
    ...option,
    textStyle: { ...theme.textStyle, ...(option.textStyle || {}) },
  }), [theme, option]);

  return (
    <ReactECharts
      option={merged}
      notMerge={true}
      lazyUpdate={true}
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%', ...style }}
      opts={{ renderer: 'canvas' }}
    />
  );
}

// 通用主题色板
export const PALETTE = {
  primary: '#00d4ff',
  primaryDeep: '#0088ff',
  cyanGlow: '#00ffcc',
  success: '#00ff88',
  warn: '#ffaa44',
  danger: '#ff4d6d',
  textMain: '#e8f4ff',
  textMid: '#8aa5c4',
  textDim: '#4a6485',
  grid: 'rgba(0,212,255,0.08)',
  axis: 'rgba(138,165,196,0.4)',
};

// 通用 grid/tooltip/legend 配置
export const commonGrid = { left: 40, right: 16, top: 30, bottom: 24 };
export const commonTooltip = {
  backgroundColor: 'rgba(8,18,38,0.95)',
  borderColor: 'rgba(0,212,255,0.4)',
  borderWidth: 1,
  textStyle: { color: '#e8f4ff', fontSize: 11, fontFamily: 'Rajdhani' },
};
export const commonAxis = {
  axisLine: { lineStyle: { color: 'rgba(138,165,196,0.3)' } },
  axisLabel: { color: '#8aa5c4', fontSize: 10, fontFamily: 'Rajdhani' },
  splitLine: { lineStyle: { color: 'rgba(0,212,255,0.06)' } },
};
