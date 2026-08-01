'use client';
import { useEffect, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { PALETTE, commonTooltip } from './EChart';

interface ShenzhenMapProps {
  // 各区充电桩数据
  data?: Array<{
    name: string;       // 区名（带"区"字，如"南山区"）
    value: number;      // 充电桩数量
    online: number;     // 在线数
    charging: number;   // 充电中
    idle: number;       // 闲置
    error: number;      // 异常
    revenue: number;    // 今日收益（元）
  }>;
  // 各站点散点数据
  stations?: Array<{
    name: string;
    coord: [number, number];  // [lng, lat]
    value: number;            // 当前功率 kW
    status: 'charging' | 'idle' | 'error' | 'disabled';
  }>;
  height?: number | string;
}

const DEFAULT_DISTRICTS = [
  { name: '宝安区', value: 220, online: 210, charging: 168, idle: 35, error: 7, revenue: 580 },
  { name: '光明区', value: 95, online: 92, charging: 68, idle: 21, error: 3, revenue: 230 },
  { name: '南山区', value: 285, online: 280, charging: 220, idle: 50, error: 10, revenue: 820 },
  { name: '龙华区', value: 145, online: 142, charging: 110, idle: 28, error: 4, revenue: 410 },
  { name: '福田区', value: 195, online: 192, charging: 155, idle: 32, error: 5, revenue: 590 },
  { name: '罗湖区', value: 130, online: 125, charging: 95, idle: 25, error: 5, revenue: 360 },
  { name: '盐田区', value: 75, online: 73, charging: 55, idle: 15, error: 3, revenue: 195 },
  { name: '龙岗区', value: 195, online: 188, charging: 145, idle: 38, error: 5, revenue: 510 },
  { name: '坪山区', value: 145, online: 140, charging: 108, idle: 28, error: 4, revenue: 380 },
];

// 站点坐标（基于深圳实际经纬度）
const DEFAULT_STATIONS = [
  { name: '前海站', coord: [113.88, 22.53], value: 78.5, status: 'charging' as const },
  { name: '科技园站', coord: [113.95, 22.55], value: 65.2, status: 'charging' as const },
  { name: '蛇口站', coord: [113.92, 22.49], value: 12.5, status: 'idle' as const },
  { name: '后海站', coord: [113.94, 22.51], value: 88.4, status: 'charging' as const },
  { name: '深圳北站', coord: [114.03, 22.61], value: 95.2, status: 'charging' as const },
  { name: '会展中心站', coord: [114.06, 22.53], value: 45.0, status: 'idle' as const },
  { name: '东门站', coord: [114.12, 22.55], value: 0, status: 'error' as const },
  { name: '国贸站', coord: [114.11, 22.54], value: 72.8, status: 'charging' as const },
  { name: '盐田港站', coord: [114.27, 22.58], value: 58.3, status: 'charging' as const },
  { name: '大梅沙站', coord: [114.30, 22.60], value: 0, status: 'disabled' as const },
  { name: '布吉站', coord: [114.13, 22.66], value: 42.5, status: 'idle' as const },
  { name: '横岗站', coord: [114.20, 22.65], value: 88.0, status: 'charging' as const },
  { name: '龙岗中心站', coord: [114.24, 22.72], value: 76.5, status: 'charging' as const },
  { name: '坪山站', coord: [114.36, 22.69], value: 62.4, status: 'charging' as const },
  { name: '光明城站', coord: [113.93, 22.78], value: 38.5, status: 'idle' as const },
  { name: '公明站', coord: [113.88, 22.80], value: 0, status: 'error' as const },
  { name: '沙井站', coord: [113.78, 22.72], value: 82.5, status: 'charging' as const },
  { name: '西乡站', coord: [113.85, 22.65], value: 55.3, status: 'charging' as const },
  { name: '福永站', coord: [113.83, 22.69], value: 0, status: 'disabled' as const },
  { name: '民治站', coord: [114.02, 22.65], value: 68.0, status: 'charging' as const },
];

const STATUS_COLOR = {
  charging: PALETTE.success,
  idle: PALETTE.primary,
  error: PALETTE.danger,
  disabled: PALETTE.textDim,
};
const STATUS_LABEL = {
  charging: '充电中',
  idle: '闲置',
  error: '异常',
  disabled: '未启用',
};

export default function ShenzhenMap({ data = DEFAULT_DISTRICTS, stations = DEFAULT_STATIONS, height = 320 }: ShenzhenMapProps) {
  const [registered, setRegistered] = useState(false);

  // 注册深圳地图
  useEffect(() => {
    fetch('/maps/shenzhen.json')
      .then(r => r.json())
      .then(geoJson => {
        echarts.registerMap('shenzhen', geoJson);
        setRegistered(true);
      })
      .catch(err => console.error('加载深圳地图失败:', err));
  }, []);

  const option = useMemo(() => {
    if (!registered) return {};
    const maxVal = Math.max(...data.map(d => d.value));
    return {
      tooltip: {
        ...commonTooltip,
        trigger: 'item',
        formatter: (p: any) => {
          if (p.seriesType === 'scatter') {
            const st = p.data;
            return `<b style="color:${STATUS_COLOR[st.status as keyof typeof STATUS_COLOR]}">${st.name}</b><br/>状态: ${STATUS_LABEL[st.status as keyof typeof STATUS_LABEL]}<br/>当前功率: <b style="color:${PALETTE.success}">${st.value.toFixed(1)} kW</b>`;
          }
          const d = p.data;
          return `<b style="color:${PALETTE.primary}">${p.name}</b><br/>充电桩总数: <b style="color:${PALETTE.cyanGlow}">${d.value}</b><br/>在线: <b style="color:${PALETTE.success}">${d.online}</b> | 闲置: <b style="color:${PALETTE.primary}">${d.idle}</b> | 异常: <b style="color:${PALETTE.danger}">${d.error}</b><br/>今日收益: <b style="color:${PALETTE.warn}">¥${d.revenue}</b>`;
        },
      },
      visualMap: {
        type: 'continuous',
        min: 0,
        max: maxVal,
        text: ['多', '少'],
        realtime: false,
        calculable: true,
        left: 8,
        bottom: 8,
        textStyle: { color: PALETTE.textMid, fontSize: 9, fontFamily: 'Rajdhani' },
        inRange: { color: ['#0a1f3d', '#0d3a66', PALETTE.primaryDeep, PALETTE.primary] },
        itemHeight: 60,
      },
      geo: {
        map: 'shenzhen',
        roam: false,
        zoom: 1.15,
        label: {
          show: true,
          color: PALETTE.textMain,
          fontSize: 10,
          fontFamily: 'Rajdhani',
          fontWeight: 600,
          formatter: (p: any) => p.name.replace('区', ''),
        },
        itemStyle: {
          areaColor: '#0a1f3d',
          borderColor: PALETTE.primary,
          borderWidth: 1,
          shadowColor: PALETTE.primary,
          shadowBlur: 8,
        },
        emphasis: {
          label: { color: PALETTE.cyanGlow, fontSize: 11, fontWeight: 700 },
          itemStyle: { areaColor: '#1a3a66', borderColor: PALETTE.cyanGlow, borderWidth: 1.5, shadowBlur: 16 },
        },
      },
      series: [
        // 区 choropleth（颜色深浅=充电桩数量）
        {
          name: '充电桩分布',
          type: 'map',
          geoIndex: 0,
          data: data.map(d => ({ name: d.name, value: d.value, ...d })),
        },
        // 站点散点
        {
          name: '充电站',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: stations.map(s => ({
            name: s.name,
            value: s.value,
            coord: s.coord,
            status: s.status,
          })),
          symbol: 'circle',
          symbolSize: (val: any, params: any) => {
            const s = params.data.status;
            if (s === 'disabled') return 5;
            if (s === 'error') return 9;
            if (s === 'idle') return 7;
            return 10 + Math.min(8, val / 12);
          },
          itemStyle: {
            color: (params: any) => STATUS_COLOR[params.data.status as keyof typeof STATUS_COLOR],
            shadowColor: (params: any) => STATUS_COLOR[params.data.status as keyof typeof STATUS_COLOR],
            shadowBlur: 10,
            borderColor: '#02070f',
            borderWidth: 1.5,
          },
          label: {
            show: true,
            position: 'right',
            color: PALETTE.textMain,
            fontSize: 9,
            fontFamily: 'Rajdhani',
            fontWeight: 600,
            formatter: '{b}',
            textShadowColor: '#02070f',
            textShadowBlur: 4,
          },
          // 充电站脉冲效果（仅 charging 状态）
          effect: {
            show: true,
            period: 2,
            trailLength: 0.5,
            symbolSize: 4,
            color: PALETTE.success,
          },
        },
        // 异常站点的涟漪效果
        {
          name: '异常告警',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: stations.filter(s => s.status === 'error').map(s => ({
            name: s.name,
            value: s.value,
            coord: s.coord,
            status: s.status,
          })),
          symbolSize: 12,
          rippleEffect: { brushType: 'stroke', period: 3, scale: 3 },
          itemStyle: { color: PALETTE.danger, shadowColor: PALETTE.danger, shadowBlur: 12 },
          label: { show: false },
        },
      ],
    };
  }, [registered, data, stations]);

  if (!registered) {
    return (
      <div style={{ height: typeof height === 'number' ? `${height}px` : height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: PALETTE.textMid, fontSize: 11 }}>
        地图加载中...
      </div>
    );
  }

  return <ReactECharts option={option} notMerge={true} lazyUpdate={true} style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}
