'use client';
import { useEffect, useRef } from 'react';

/**
 * 深空星尘背景 —— Canvas 粒子层
 * 绘制 200~300 个缓慢移动、明暗闪烁的小白点/淡蓝色点
 * 绝对定位 + pointer-events: none，不干扰地图交互
 */
interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  vx: number;
  vy: number;
  color: string;
}

export default function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 颜色池：白色、淡蓝色、淡青色
    const colors = ['#ffffff', '#a0d4ff', '#80c0ff', '#c0e0ff'];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      // 大幅增加粒子数量（原 280 → 600），让星空更密集深邃
      const starCount = Math.min(600, Math.floor((canvas.width * canvas.height) / 2500));
      const stars: Star[] = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          // 粒子尺寸加大（原 0.3~2.1 → 0.5~3.5）
          size: Math.random() * 3 + 0.5,
          // 基础亮度降低（原 0.4~1.0 → 0.2~0.5），让星辰不那么抢眼
          baseOpacity: Math.random() * 0.3 + 0.2,
          opacity: 0,
          twinkleSpeed: Math.random() * 0.03 + 0.008,
          twinklePhase: Math.random() * Math.PI * 2,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      starsRef.current = stars;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        // 缓慢移动
        s.x += s.vx;
        s.y += s.vy;
        // 边界回绕
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;
        // 闪烁幅度加大，让粒子更明亮（原 0.5+0.5*sin → 0.6+0.4*sin，整体更亮）
        s.twinklePhase += s.twinkleSpeed;
        s.opacity = s.baseOpacity * (0.6 + 0.4 * Math.sin(s.twinklePhase));

        // 绘制（带较强光晕，让粒子更醒目）
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.opacity;  // 不再 +0.2，降低整体亮度
        ctx.shadowBlur = s.size * 4;
        ctx.shadowColor = s.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      animationRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,  // 在底座(0)之上，面板(40)之下
      }}
    />
  );
}
