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

// 默认省级数据（模拟全国分布）
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

export default function ChinaMap({ data = DEFAULT_PROVINCES, height = 400 }: ChinaMapProps) {
  const [registered, setRegistered] = useState(false);
  const chartRef = useRef<ReactECharts>(null);
  const carouselIdx = useRef(0);

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
    return {
      tooltip: {
        ...commonTooltip,
        trigger: 'item',
        formatter: (p: any) => {
          const d = p.data;
          if (!d || !d.value) return `${p.name}<br/>暂无数据`;
          return `<b style="color:${PALETTE.primary}">${p.name}</b><br/>` +
            `总负荷: <b style="color:${PALETTE.warn}">${d.value} MW</b><br/>` +
            `<span style="color:${PALETTE.success}">☀ 光伏: ${d.pv} MW</span><br/>` +
            `<span style="color:${PALETTE.cyanGlow}">🔌 充电桩: ${d.charging} MW</span><br/>` +
            `<span style="color:${PALETTE.danger}">❄ 空调: ${d.ac} MW</span><br/>` +
            `<span style="color:${PALETTE.primary}">⚡ 配网: ${d.grid} MW</span><br/>` +
            `<span style="color:${PALETTE.textMid}">🏢 楼宇: ${d.building} MW</span>`;
        },
      },
      visualMap: {
        type: 'continuous',
        min: 0,
        max: maxVal,
        text: ['高', '低'],
        realtime: false,
        calculable: true,
        left: 10,
        bottom: 10,
        textStyle: { color: PALETTE.textMid, fontSize: 9, fontFamily: 'Rajdhani' },
        inRange: { color: ['#0a1f3d', '#0d3a66', PALETTE.primaryDeep, PALETTE.primary, PALETTE.cyanGlow] },
        itemHeight: 80,
        itemWidth: 12,
      },
      geo: {
        map: 'china',
        roam: true,
        zoom: 1.2,
        label: { show: false },
        itemStyle: {
          areaColor: '#0a1f3d',
          borderColor: PALETTE.primary,
          borderWidth: 0.8,
          shadowColor: PALETTE.primary,
          shadowBlur: 6,
        },
        emphasis: {
          label: { show: true, color: PALETTE.cyanGlow, fontSize: 11, fontFamily: 'Rajdhani', fontWeight: 700 },
          itemStyle: { areaColor: '#1a4a7a', borderColor: PALETTE.cyanGlow, borderWidth: 1.5, shadowBlur: 16, shadowColor: PALETTE.cyanGlow },
        },
      },
      series: [
        {
          name: '省级负荷',
          type: 'map',
          geoIndex: 0,
          data: data,
        },
        // 涟漪效果层 - 在轮播省份的中心坐标显示脉冲
        {
          name: '脉冲',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: [],
          symbolSize: 8,
          rippleEffect: { brushType: 'stroke', period: 2, scale: 4 },
          itemStyle: { color: PALETTE.cyanGlow, shadowColor: PALETTE.cyanGlow, shadowBlur: 10 },
          zlevel: 2,
        },
      ],
    };
  }, [registered, data]);

  // 周期性轮播省份：高亮 + 显示tooltip + 涟漪
  useEffect(() => {
    if (!registered || !chartRef.current) return;
    const chart = chartRef.current.getEchartsInstance();
    // 构建省份名称到中心坐标的映射（从GeoJSON properties.centroid）
    const provinceCentroids: Record<string, [number, number]> = {};
    // 从已注册的地图中获取坐标
    const geoJson = (echarts as any).getMap?.('china')?.geoJson;
    if (geoJson && geoJson.features) {
      geoJson.features.forEach((f: any) => {
        if (f.properties && f.properties.centroid) {
          provinceCentroids[f.properties.name] = f.properties.centroid;
        }
      });
    }

    const interval = setInterval(() => {
      const idx = carouselIdx.current % data.length;
      const province = data[idx];
      carouselIdx.current++;

      // 1. 高亮省份
      chart.dispatchAction({ type: 'downplay' });
      chart.dispatchAction({ type: 'highlight', name: province.name });
      // 2. 显示 tooltip
      chart.dispatchAction({ type: 'showTip', name: province.name });
      // 3. 涟漪效果：在省份中心显示脉冲点
      const centroid = provinceCentroids[province.name];
      if (centroid) {
        chart.setOption({
          series: [
            {},
            {
              data: [{ name: province.name, value: [...centroid, province.value] }],
            },
          ],
        });
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

  return <ReactECharts ref={chartRef} option={option} notMerge={false} lazyUpdate={true} style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}
