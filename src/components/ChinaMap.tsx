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

// 省会城市坐标
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
  // 用于触发 option 重建
  const [rippleProvince, setRippleProvince] = useState<string>('');
  // 标记鼠标是否悬停在地图上（有焦点时不轮播）
  const isHovered = useRef(false);

  useEffect(() => {
    fetch('/maps/china.json')
      .then(r => r.json())
      .then(geoJson => {
        echarts.registerMap('china', geoJson);
        setRegistered(true);
      })
      .catch(err => console.error('加载中国地图失败:', err));
  }, []);

  // 监听鼠标悬停/移出，控制轮播开关
  useEffect(() => {
    if (!registered) return;
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;

    const onMouseOver = (params: any) => {
      // 只对 map series 的省份悬停生效（忽略流星、涟漪点等其他 series）
      if (params.seriesType === 'map' || params.componentType === 'series') {
        if (params.seriesName === '省级负荷' || params.seriesIndex === 0) {
          isHovered.current = true;
          // 鼠标悬停时同步更新涟漪点位置
          if (params.name) setRippleProvince(params.name);
        }
      }
    };
    const onMouseOut = () => {
      isHovered.current = false;
    };

    chart.on('mouseover', onMouseOver);
    chart.on('mouseout', onMouseOut);
    // 鼠标离开整个图表区域时也清除焦点
    chart.getZr().on('mouseout', (e: any) => {
      if (!e.relatedTarget) {
        isHovered.current = false;
      }
    });

    return () => {
      chart.off('mouseover', onMouseOver);
      chart.off('mouseout', onMouseOut);
    };
  }, [registered]);

  const option = useMemo(() => {
    if (!registered) return {};
    const maxVal = Math.max(...data.map(d => d.value));
    // 涟漪点数据
    const rippleData = rippleProvince && PROVINCE_CENTERS[rippleProvince]
      ? [[...PROVINCE_CENTERS[rippleProvince], data.find(d => d.name === rippleProvince)?.value || 0]]
      : [];

    // 光束数据：所有省份 → 广东（数据汇入）
    // 每条线设置 delay 错峰发射，避免所有流星同时飞行造成视觉混乱
    // 同时确保每条流星能完整走完从起点到广东的路径后再消失重置
    const guangdongCenter = PROVINCE_CENTERS['广东省'] || [113.28, 23.13];
    const beamLines = data
      .filter(d => d.name !== '广东省' && PROVINCE_CENTERS[d.name])
      .map((d, idx) => {
        const from = PROVINCE_CENTERS[d.name];
        // 曲线控制点（在两点中间偏上，形成弧线），弧度根据距离调整
        const dist = Math.abs(from[0] - guangdongCenter[0]) + Math.abs(from[1] - guangdongCenter[1]);
        const midLng = (from[0] + guangdongCenter[0]) / 2;
        const midLat = (from[1] + guangdongCenter[1]) / 2 + dist * 0.12;
        return {
          coords: [from, [midLng, midLat], guangdongCenter],
          value: d.value,
          // 错峰发射：每条线延迟 (idx % 5) * 1.2s 发射
          // 最多 5 条流星同时在天上，每条间隔 1.2 秒
          // 周期 6s 内会出现 5 条流星，但不会全部同时出现
          effect: { delay: (idx % 5) * 1.2 },
        };
      });

    return {
      tooltip: {
        ...commonTooltip,
        trigger: 'item',
        enterable: false,
        alwaysShowContent: false,
        formatter: (p: any) => {
          const d = p.data;
          if (!d || (!d.value && d.value !== 0)) return `${p.name}<br/>暂无数据`;
          if (typeof d.value === 'object') return `${p.name}`;
          return `<div style="border:1px solid rgba(0,255,204,0.4);border-radius:6px;padding:6px 10px;background:rgba(8,18,38,0.95);">` +
            `<b style="color:#00ffcc;font-size:14px;">${p.name}</b><br/>` +
            `总负荷: <b style="color:#ffaa44;font-size:13px;">${d.value} MW</b><br/>` +
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
        // 默认省份颜色统一用深蓝色系，让选中橙色高亮更明显
        inRange: { color: ['#0a1f3d', '#0d3a66', '#0d3a66', '#0d3a66', '#0d3a66'] },
        itemHeight: 80, itemWidth: 12,
      },
      geo: {
        map: 'china', roam: true, zoom: 1.2,
        label: { show: false },
        // 地图省份默认样式
        itemStyle: {
          areaColor: '#0a1f3d',
          borderColor: PALETTE.primary,
          borderWidth: 0.8,
          shadowColor: PALETTE.primary,
          shadowBlur: 6,
        },
        // 鼠标悬停样式 / 轮播选中样式（强制橙色高亮，覆盖 visualMap）
        emphasis: {
          label: {
            show: true,
            color: '#ffffff',
            fontSize: 13,
            fontFamily: 'Rajdhani',
            fontWeight: 700,
            textShadowColor: 'rgba(0,0,0,0.6)',
            textShadowBlur: 4,
          },
          itemStyle: {
            areaColor: '#ff8800',        // 选中省份亮橙色（强制覆盖 visualMap）
            borderColor: '#ffffff',       // 白色高亮边
            borderWidth: 2,
            shadowBlur: 30,
            shadowColor: '#ff8800',
          },
        },
        // 鼠标选中状态（点击）
        select: {
          label: { show: true, color: '#ffffff', fontSize: 13, fontWeight: 700 },
          itemStyle: { areaColor: '#ff8800', borderColor: '#ffffff', borderWidth: 2, shadowBlur: 30, shadowColor: '#ff8800' },
        },
        // 允许地图响应鼠标事件
        silent: false,
        // selectedMode 可让点击保持选中
        selectedMode: false,
      },
      series: [
        {
          name: '省级负荷', type: 'map', geoIndex: 0, data: data,
          // series 层也配置 emphasis，确保高亮时 areaColor 生效（覆盖 visualMap）
          emphasis: {
            label: {
              show: true,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              textShadowColor: 'rgba(0,0,0,0.6)',
              textShadowBlur: 4,
            },
            itemStyle: {
              areaColor: '#ff8800',
              borderColor: '#ffffff',
              borderWidth: 2,
              shadowBlur: 30,
              shadowColor: '#ff8800',
            },
          },
        },
        {
          name: '脉冲', type: 'effectScatter', coordinateSystem: 'geo',
          data: rippleData, symbolSize: 14,
          rippleEffect: { brushType: 'stroke', period: 2.5, scale: 6 },
          itemStyle: { color: '#00ffcc', shadowColor: '#00ffcc', shadowBlur: 15 },
          zlevel: 2,
        },
        // 光束飞线：各省 → 广东（线条重点在广东，终点更亮更粗）
        {
          name: '数据汇入',
          type: 'lines',
          coordinateSystem: 'geo',
          data: beamLines,
          // 飞线轨迹：渐变橙色线条，终点（广东）更亮更粗
          lineStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: 'rgba(255, 170, 68, 0.1)' },    // 起点很淡
                { offset: 0.4, color: 'rgba(255, 170, 68, 0.35)' },  // 中段淡
                { offset: 0.8, color: 'rgba(255, 170, 68, 0.85)' },  // 接近终点亮
                { offset: 1, color: 'rgba(255, 136, 0, 1)' },        // 终点（广东）最亮
              ],
            },
            width: 2,            // 加粗（1.5→2）
            curveness: 0.3,
            shadowColor: 'rgba(255, 136, 0, 0.8)',  // 终点橙色光晕
            shadowBlur: 10,      // 加大光晕（6→10）
          },
          zlevel: 3,
        },
        // 广东终点闪烁（数据到达后亮光）
        {
          name: '数据中心',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          data: [[...guangdongCenter, 999]],
          symbolSize: 20,
          rippleEffect: { brushType: 'stroke', period: 2.5, scale: 5 },
          itemStyle: { color: '#ff8800', shadowColor: '#ff8800', shadowBlur: 25 },
          label: {
            show: true,
            formatter: '数据中心',
            position: 'right',
            color: '#ff8800',
            fontSize: 10,
            fontFamily: 'Rajdhani',
            fontWeight: 700,
            textShadowColor: 'rgba(255,136,0,0.5)',
            textShadowBlur: 6,
          },
          zlevel: 4,
        },
      ],
    };
  }, [registered, data, rippleProvince]);

  // 周期性轮播：模拟鼠标 hover 效果，8秒轮换
  // 智能控制：鼠标悬停在地图上时（有焦点）停止轮播，离开后继续
  useEffect(() => {
    if (!registered) return;
    const interval = setInterval(() => {
      // 有焦点时不轮播（鼠标正在悬停某个省份）
      if (isHovered.current) return;

      const chart = chartRef.current?.getEchartsInstance();
      if (!chart) return;

      const idx = carouselIdx.current % data.length;
      const province = data[idx];
      carouselIdx.current++;

      // 1. 先取消上一个高亮
      chart.dispatchAction({ type: 'downplay' });
      // 2. 隐藏上一个 tooltip
      chart.dispatchAction({ type: 'hideTip' });

      // 延迟100ms后高亮新的（让前一个先消失）
      setTimeout(() => {
        // 如果延迟期间鼠标移入了地图，则取消本次轮播高亮
        if (isHovered.current) return;
        // 3. 高亮当前省份（触发 emphasis 样式 = 模拟鼠标悬停）
        chart.dispatchAction({
          type: 'highlight',
          seriesIndex: 0,
          name: province.name,
        });
        // 4. 显示 tooltip
        chart.dispatchAction({
          type: 'showTip',
          seriesIndex: 0,
          name: province.name,
        });
        // 5. 更新涟漪效果
        setRippleProvince(province.name);
      }, 100);
    }, 8000); // 8秒轮换

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
