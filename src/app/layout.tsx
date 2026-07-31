import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '综合能源驾驶舱 · Energy Cockpit',
  description: '综合能源管理驾驶舱 - WebGPU 3D 可视化（能源总览/楼宇管理/光伏发电/充电桩/负荷管理/碳监测）',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
