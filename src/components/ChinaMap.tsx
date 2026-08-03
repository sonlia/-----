'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { PALETTE, commonTooltip } from './EChart';

interface ChinaMapProps {
  data?: Array<{
    name: string;
    value: number;
    pv?: number;
    charging?: number;
    ac?: number;
    grid?: number;
    building?: number;
  }>;
  height?: number | string;
}

// 默认省级数据
const DEFAULT_PROVINCES = [
  { name: '广东省', value: 186.5, pv: 32.5, charging: 48.2, ac: 28.6, grid: 52.0, building: 18.4 },
  { name: '江苏省', value: 165.2, pv: 28.3, charging: 35.6, ac: 22.1, grid: 45.8, building: 16.2 },
  { name: '浙江省', value: 142.8, pv: 25.6, charging: 32.1, ac: 19.8, grid: 38.5, building: 14.5 },
  { name: '山东省', value: 158.3, pv: 22.4, charging: 28.5, ac: 25.6, grid: 42.1, building: 15.8 },
  { name: '北京市', value: 98.5, pv: 15.2, charging: 18.6, ac: 12.3, grid: 28.5, building: 9.8 },
  { name: '上海市', value: 95.2, pv: 14.8, charging: 22.3, ac: 11.5, grid: 26.8, building: 9.2 },
  { name: '四川省', value: 125.6, pv: 35.2, charging: 15.8, ac: 18.6, grid: 32.5, building: 12.3 },
  { name: '湖北省', value: 112.3, pv: 20.5, charging: 16.2, ac: 16.8, grid: 30.2, building: 11.5 },
  { name: '福建省', value: 108.5, pv: 26.8, charging: 14.5, ac: 15.2, grid: 28.6, building: 10.8 },
  { name: '河南省', value: 118.6, pv: 18.5, charging: 19.6, ac: 20.1, grid: 32.5, building: 12.6 },
  { name: '湖南省', value: 105.2, pv: 19.6, charging: 15.8, ac: 17.2, grid: 28.5, building: 10.5 },
  { name: '河北省', value: 115.8, pv: 16.8, charging: 18.2, ac: 19.5, grid: 32.1, building: 11.8 },
  { name: '安徽省', value: 102.5, pv: 17.5, charging: 16.8, ac: 16.2, grid: 28.8, building: 10.2 },
  { name: '江西省', value: 95.6, pv: 18.2, charging: 12.5, ac: 15.6, grid: 25.8, building: 9.5 },
  { name: '辽宁省', value: 98.2, pv: 12.5, charging: 15.6, ac: 18.2, grid: 28.5, building: 9.8 },
  { name: '陕西省', value: 88.5, pv: 15.6, charging: 12.8, ac: 14.5, grid: 25.2, building: 8.8 },
  { name: '黑龙江省', value: 85.2, pv: 10.2, charging: 12.5, ac: 16.8, grid: 24.5, building: 8.5 },
  { name: '吉林省', value: 82.6, pv: 11.5, charging: 11.2, ac: 15.6, grid: 23.8, building: 8.2 },
  { name: '云南省', value: 78.5, pv: 22.5, charging: 8.6, ac: 12.5, grid: 22.8, building: 7.8 },
  { name: '山西省', value: 92.3, pv: 14.5, charging: 13.6, ac: 16.2, grid: 26.5, building: 9.2 },
  { name: '广西壮族自治区', value: 88.6, pv: 20.5, charging: 12.8, ac: 14.5, grid: 25.2, building: 8.8 },
  { name: '重庆市', value: 86.5, pv: 16.8, charging: 14.5, ac: 13.8, grid: 24.8, building: 8.6 },
  { name: '内蒙古自治区', value: 82.5, pv: 28.5, charging: 8.5, ac: 12.6, grid: 23.5, building: 8.2 },
  { name: '新疆维吾尔自治区', value: 75.6, pv: 32.5, charging: 6.8, ac: 10.5, grid: 21.8, building: 7.5 },
  { name: '甘肃省', value: 68.5, pv: 22.8, charging: 6.5, ac: 9.8, grid: 20.2, building: 6.8 },
  { name: '海南省', value: 52.3, pv: 18.5, charging: 8.6, ac: 8.5, grid: 15.8, building: 5.2 },
  { name: '宁夏回族自治区', value: 55.6, pv: 15.6, charging: 5.8, ac: 8.2, grid: 16.5, building: 5.5 },
  { name: '青海省', value: 48.5, pv: 18.6, charging: 4.5, ac: 6.8, grid: 14.2, building: 4.8 },
  { name: '西藏自治区', value: 35.2, pv: 15.8, charging: 2.5, ac: 4.5, grid: 10.5, building: 3.5 },
  { name: '天津市', value: 78.6, pv: 12.5, charging: 15.6, ac: 10.2, grid: 22.5, building: 7.8 },
  { name: '贵州省', value: 72.5, pv: 16.8, charging: 8.5, ac: 11.5, grid: 21.2, building: 7.2 },
];

// 省会城市坐标（lng, lat）用于涟漪定位
const PROVINCE_CENTERS: Record<string, [number, number]> = {
  '广东省': [113.28, 23.13], '江苏省': [118.78, 32.06], '浙江省': [120.16, 30.27],
  '山东省': [117.0, 36.65], '北京市': [116.41, 39.90], '上海市': [121.47, 31.23],
  '四川省': [104.07, 30.67], '湖北省': [114.31, 30.59], '福建省': [119.30, 26.08],
  '河南省': [113.65, 34.76], '湖南省': [112.98, 28.19], '河北省': [114.50, 38.05],
  '安徽省': [117.27, 31.86], '江西省': [115.89, 28.68], '辽宁省': [123.43, 41.80],
  '陕西省': [108.95, 34.27], '黑龙江省': [126.53, 45.80], '吉林省': [125.32, 43.82],
  '云南省': [102.83, 24.88], '山西省': [112.55, 37.87], '广西壮族自治区': [108.32, 22.82],
  '重庆市': [106.55, 29.56], '内蒙古自治区': [111.75, 40.84], '新疆维吾尔自治区': [87.62, 43.83],
  '甘肃省': [103.83, 36.06], '海南省': [110.32, 20.03], '宁夏回族自治区': [106.27, 38.47],
  '青海省': [101.78, 36.62], '西藏自治区': [91.13, 29.65], '天津市': [117.20, 39.12],
  '贵州省': [106.71, 26.57],
};

export default function ChinaMap({ data = DEFAULT_PROVINCES, height = 400 }: ChinaMapProps) {
  const [registered, setRegistered] = useState(false);
  const chartRef = useRef<ReactECharts>(null);
  const carouselIdx = useRef(0);
  const [highlightProvince, setHighlightProvince] = useState<string>('');

  useEffect(() => {
    fetch('/maps/china.json')
      .then(r => r.json())
      .then(geoJson => {
        echarts.registerMap('china', geoJson);
        setRegistered(true);
      })
      .catch(err => console.error('加载中国地图失败:', err));
  }, []);

  const option = useMemo(() => {
    if (!registered) return {};
    const maxVal = Math.max(...data.map(d => d.value));
    // 为当前高亮省份设置特殊样式
    const mapData = data.map(d => ({
      ...d,
      itemStyle: d.name === highlightProvince ? {
        areaColor: '#00ffcc',
        borderColor: '#00ffcc',
        borderWidth: 2,
        shadowColor: '#00ffcc',
        shadowBlur: 20,
      } : undefined,
      label: d.name === highlightProvince ? { show: true, color: '#00ffcc', fontSize: 11, fontWeight: 700 } : undefined,
    }));

    // 涟漪点数据：高亮省份的中心坐标
    const rippleData = highlightProvince && PROVINCE_CENTERS[highlightProvince]
      ? [[...PROVINCE_CENTERS[highlightProvince], data.find(d => d.name === highlightProvince)?.value || 0]]
      : [];

    return {
      tooltip: {
        ...commonTooltip,
        trigger: 'item',
        enterable: false,
        formatter: (p: any) => {
          const d = p.data;
          if (!d || (!d.value && d.value !== 0)) return `${p.name}<br/>暂无数据`;
          if (typeof d.value === 'object') return `${p.name}`;
          return `<div style="border:1px solid rgba(0,255,204,0.3);border-radius:4px;padding:4px 8px;">` +
            `<b style="color:#00ffcc;font-size:13px;">${p.name}</b><br/>` +
            `总负荷: <b style="color:#ffaa44">${d.value} MW</b><br/>` +
            `<span style="color:#00ff88">☀ 光伏: ${d.pv} MW</span><br/>` +
            `<span style="color:#00ffcc">🔌 充电桩: ${d.charging} MW</span><br/>` +
            `<span style="color:#ff4d6d">❄ 空调: ${d.ac} MW</span><br/>` +
            `<span style="color:#00d4ff">⚡ 配网: ${d.grid} MW</span><br/>` +
            `<span style="color:#8aa5c4">🏢 楼宇: ${d.building} MW</span>` +
            `</div>`;
        },
      },
      visualMap: {
        type: 'continuous', min: 0, max: maxVal,
        text: ['高', '低'], realtime: false, calculable: true,
        left: 10, bottom: 10,
        textStyle: { color: PALETTE.textMid, fontSize: 9, fontFamily: 'Rajdhani' },
        inRange: { color: ['#0a1f3d', '#0d3a66', PALETTE.primaryDeep, PALETTE.primary, PALETTE.cyanGlow] },
        itemHeight: 80, itemWidth: 12,
      },
      geo: {
        map: 'china', roam: true, zoom: 1.2,
        label: { show: false },
        itemStyle: { areaColor: '#0a1f3d', borderColor: PALETTE.primary, borderWidth: 0.8, shadowColor: PALETTE.primary, shadowBlur: 6 },
        emphasis: {
          label: { show: true, color: PALETTE.cyanGlow, fontSize: 11, fontFamily: 'Rajdhani', fontWeight: 700 },
          itemStyle: { areaColor: '#1a4a7a', borderColor: PALETTE.cyanGlow, borderWidth: 1.5, shadowBlur: 16, shadowColor: PALETTE.cyanGlow },
        },
      },
      series: [
        { name: '省级负荷', type: 'map', geoIndex: 0, data: mapData },
        {
          name: '脉冲', type: 'effectScatter', coordinateSystem: 'geo',
          data: rippleData, symbolSize: 12,
          rippleEffect: { brushType: 'stroke', period: 2, scale: 5 },
          itemStyle: { color: PALETTE.cyanGlow, shadowColor: PALETTE.cyanGlow, shadowBlur: 15 },
          label: { show: true, formatter: (p: any) => '', position: 'right' },
          zlevel: 2,
        },
      ],
    };
  }, [registered, data, highlightProvince]);

  // 周期性轮播省份
  useEffect(() => {
    if (!registered) return;
    const interval = setInterval(() => {
      const idx = carouselIdx.current % data.length;
      const province = data[idx];
      carouselIdx.current++;
      setHighlightProvince(province.name);

      // 显示 tooltip
      const chart = chartRef.current?.getEchartsInstance();
      if (chart) {
        const center = PROVINCE_CENTERS[province.name];
        if (center) {
          chart.dispatchAction({ type: 'showTip', seriesIndex: 1, dataIndex: 0 });
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [registered, data]);

  if (!registered) {
    return (
      <div style={{ height: typeof height === 'number' ? `${height}px` : height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: PALETTE.textMid, fontSize: 11 }}>
        正在加载中国地图...
      </div>
    );
  }

  return <ReactECharts ref={chartRef} option={option} notMerge={true} lazyUpdate={true} style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}
