'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { PALETTE, commonTooltip } from './EChart';

// 颜色插值函数：根据 ratio 在两个 hex 颜色之间线性插值，返回 hex 格式
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex2rgb = (hex: string) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = hex2rgb(color1);
  const [r2, g2, b2] = hex2rgb(color2);
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  // 返回 hex 格式（ECharts areaColor 兼容性更好）
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

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
  // 用于触发 option 重建（涟漪点位置）
  const [rippleProvince, setRippleProvince] = useState<string>('');
  // 当前高亮的省份（轮播或 hover 时设置）—— 数据驱动高亮，比 dispatchAction 可靠
  const [highlightedProvince, setHighlightedProvince] = useState<string>('');
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

  // 监听鼠标悬停/移出/点击，控制轮播开关和高亮
  useEffect(() => {
    if (!registered) return;
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;

    // 延迟清除焦点，避免鼠标在省份间移动时 isHovered 短暂为 false 导致轮播误触发
    let clearHoverTimer: any = null;
    const scheduleClearHover = () => {
      if (clearHoverTimer) clearTimeout(clearHoverTimer);
      clearHoverTimer = setTimeout(() => {
        isHovered.current = false;
      }, 200);  // 200ms 内没进入新省份才清除焦点
    };
    const cancelClearHover = () => {
      if (clearHoverTimer) {
        clearTimeout(clearHoverTimer);
        clearHoverTimer = null;
      }
    };

    const onMouseOver = (params: any) => {
      // 只对 map 类型的省份悬停生效（忽略 effectScatter 涟漪点、lines 流光等）
      if (params.seriesType === 'map') {
        cancelClearHover();  // 取消延迟清除
        isHovered.current = true;
        // 鼠标 hover 时立即清除之前的高亮（轮播的、上一次 hover 的），再设置新的
        if (params.name) {
          console.log('[hover] 清除旧高亮 → 设置新高亮:', params.name);
          // 先清除（触发 option 重建，所有省份恢复默认蓝色）
          setHighlightedProvince('');
          setRippleProvince('');
          // 用 requestAnimationFrame 确保清除先渲染，再设置新高亮
          requestAnimationFrame(() => {
            setHighlightedProvince(params.name);
            setRippleProvince(params.name);
          });
        }
      }
    };
    const onMouseOut = (params: any) => {
      // 只对 map 类型的移出才清除焦点（避免移到流光上就清除）
      if (params.seriesType === 'map' || !params.seriesType) {
        scheduleClearHover();  // 延迟清除，避免省份间移动闪烁
      }
    };
    // 点击省份：触发和悬停一样的选中效果 + tooltip，并保持焦点
    const onChartClick = (params: any) => {
      if (params.seriesType === 'map' && params.name) {
        cancelClearHover();
        isHovered.current = true;
        console.log('[click] 清除旧高亮 → 设置新高亮:', params.name);
        // 先清除之前的高亮，再设置新的
        setHighlightedProvince('');
        setRippleProvince('');
        requestAnimationFrame(() => {
          setHighlightedProvince(params.name);
          setRippleProvince(params.name);
          // 显示 tooltip
          const chart = chartRef.current?.getEchartsInstance();
          if (chart) {
            chart.dispatchAction({
              type: 'showTip',
              seriesIndex: 0,
              name: params.name,
            });
          }
        });
      }
    };

    chart.on('mouseover', onMouseOver);
    chart.on('mouseout', onMouseOut);
    chart.on('click', onChartClick);
    // 鼠标离开整个 canvas 时立即清除焦点
    chart.getZr().on('mouseout', (e: any) => {
      if (!e.toElement && !e.relatedTarget) {
        cancelClearHover();
        isHovered.current = false;
      }
    });

    return () => {
      chart.off('mouseover', onMouseOver);
      chart.off('mouseout', onMouseOut);
      chart.off('click', onChartClick);
      if (clearHoverTimer) clearTimeout(clearHoverTimer);
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
    // 每条线随机 delay 错峰发射，不等上一个到广东才发射
    const guangdongCenter: [number, number] = [113.28, 23.13];
    const beamLines = data
      .filter(d => d.name !== '广东省' && PROVINCE_CENTERS[d.name])
      .map((d, idx) => {
        const from = PROVINCE_CENTERS[d.name];
        // 随机错峰发射：0~6s 之间随机延迟（周期 6s 内随时发射）
        // 不等上一个到广东，形成持续不断的流星雨
        const randomDelay = (idx * 0.7) % 6;
        return {
          coords: [from, guangdongCenter],
          value: d.value,
          effect: { delay: randomDelay },
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
      // 去掉 visualMap —— 它会强制覆盖 areaColor，导致 emphasis 高亮无效
      // 改用 series data itemStyle + emphasis 控制省份颜色
      geo: {
        map: 'china', roam: true, zoom: 1.9, center: [104, 17],
        label: { show: false },
        // geo 默认 itemStyle（兜底，未在 data 中定义的省份显示此颜色）
        itemStyle: {
          areaColor: '#1a3a5c',
          borderColor: PALETTE.primary,
          borderWidth: 0.8,
          shadowColor: PALETTE.primary,
          shadowBlur: 6,
        },
        silent: false,
      },
      series: [
        {
          name: '省级负荷', type: 'map', geoIndex: 0,
          // 数据驱动高亮：非高亮省份根据 value 蓝色渐变，高亮省份明黄色
          data: data.map(d => {
            // 根据 value 计算蓝色深浅（中蓝 #1a3a5c → 亮蓝 #3a9ad4）
            // 用较亮的蓝色范围，避免在深空背景下看起来像灰色
            const ratio = maxVal > 0 ? d.value / maxVal : 0;
            const defaultBlue = interpolateColor('#1a3a5c', '#3a9ad4', ratio);
            const isHighlight = d.name === highlightedProvince;
            return {
              name: d.name,
              value: d.value,
              pv: d.pv,
              charging: d.charging,
              ac: d.ac,
              grid: d.grid,
              building: d.building,
              // 高亮：纯橘红 #ff5500 + 白边 + 光晕；非高亮：蓝色渐变
              itemStyle: {
                areaColor: isHighlight ? '#ff5500' : defaultBlue,
                borderColor: isHighlight ? '#ffffff' : PALETTE.primary,
                borderWidth: isHighlight ? 2 : 0.8,
                shadowBlur: isHighlight ? 30 : 6,
                shadowColor: isHighlight ? '#ff5500' : PALETTE.primary,
              },
              label: isHighlight ? {
                show: true,
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                textShadowColor: 'rgba(0,0,0,0.6)',
                textShadowBlur: 4,
              } : { show: false },
            };
          }),
          // emphasis: 鼠标真实 hover 时也显示纯橘红高亮（和轮播一致）
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
              areaColor: '#ff5500',
              borderColor: '#ffffff',
              borderWidth: 2,
              shadowBlur: 30,
              shadowColor: '#ff5500',
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
        // 光束飞线：各省 → 广东（隐藏弧线轨迹，只显示流星动画）
        {
          name: '数据汇入',
          type: 'lines',
          coordinateSystem: 'geo',
          data: beamLines,
          // 飞线轨迹完全透明（隐藏弧线，只显示流星本体）
          lineStyle: {
            color: 'transparent',
            width: 0,
            curveness: 0.3,
          },
          // 流星飞行动效：亮蓝色流星，纤细精致，与蓝色科技主题协调
          effect: {
            show: true,
            period: 6,             // 飞行周期 6 秒
            trailLength: 0.2,      // 拖尾缩短（0.35→0.2），更利落精致
            symbol: 'circle',
            symbolSize: 2,         // 流星更细（3→2）
            color: '#00d4ff',      // 亮蓝色（与地图边框、脉冲颜色呼应）
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
          // 加大模糊（shadowBlur 25→40）+ 半透明，营造柔和光晕
          itemStyle: { color: '#ff8800', shadowColor: '#ff8800', shadowBlur: 40, opacity: 0.85 },
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
  }, [registered, data, rippleProvince, highlightedProvince]);

  // 周期性轮播：数据驱动高亮 + requestAnimationFrame 确保状态更新与 ECharts 渲染同步
  // 智能控制：鼠标有焦点时完全跳过（不清除、不设置），只显示用户 hover/click 的区域
  useEffect(() => {
    if (!registered) return;
    const interval = setInterval(() => {
      // 鼠标有焦点时完全跳过轮播（不干扰用户 hover/click 的高亮）
      if (isHovered.current) {
        console.log('[轮播] 鼠标有焦点，完全跳过');
        return;
      }

      const chart = chartRef.current?.getEchartsInstance();
      if (!chart) return;

      const idx = carouselIdx.current % data.length;
      const province = data[idx];
      carouselIdx.current++;
      console.log('[轮播] 选中:', province.name);

      // --- 步骤1: 先清除所有高亮和 Tooltip ---
      setHighlightedProvince('');
      setRippleProvince('');
      chart.dispatchAction({ type: 'hideTip' });
      chart.dispatchAction({ type: 'downplay', seriesIndex: 0 });

      // --- 步骤2: 用 requestAnimationFrame 确保状态更新和 DOM 渲染完成 ---
      requestAnimationFrame(() => {
        // 鼠标有焦点时取消本次轮播（不清除用户的高亮）
        if (isHovered.current) {
          console.log('[轮播] 渲染期间鼠标有焦点，取消（保留用户高亮）');
          return;
        }
        // 再用短延时确保 React 批处理更新完成
        setTimeout(() => {
          if (isHovered.current) {
            console.log('[轮播] 延迟期间鼠标有焦点，取消（保留用户高亮）');
            return;
          }

          // 1. 更新高亮省份状态（触发最终的 option 重建）
          setHighlightedProvince(province.name);
          setRippleProvince(province.name);

          // 2. 在下一个宏任务中派发 ECharts 动作，确保新 option 已应用
          setTimeout(() => {
            // 派发前再次检查，有焦点则不派发（避免覆盖用户高亮）
            if (isHovered.current) {
              console.log('[轮播] 派发前鼠标有焦点，取消（保留用户高亮）');
              return;
            }

            const latestChart = chartRef.current?.getEchartsInstance();
            if (!latestChart) return;

            // 查找当前省份在最新数据中的准确索引
            const currentData = (latestChart.getOption() as any)?.series?.[0]?.data || [];
            const currentIdx = currentData.findIndex((d: any) => d.name === province.name);
            if (currentIdx === -1) {
              console.warn('[轮播] 未找到省份数据:', province.name);
              return;
            }

            // 派发 highlight 和 showTip 动作
            latestChart.dispatchAction({
              type: 'highlight',
              seriesIndex: 0,
              dataIndex: currentIdx,
            });
            latestChart.dispatchAction({
              type: 'showTip',
              seriesIndex: 0,
              dataIndex: currentIdx,
            });
            console.log('[轮播] 已派发 highlight + showTip:', province.name, 'idx:', currentIdx);
          }, 50);
        }, 50);
      });
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

  return <ReactECharts ref={chartRef} option={option} notMerge={true} lazyUpdate={false} style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}
