import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '综合能源驾驶舱 · Energy Cockpit',
  description: 'Smart Building Digital Twin - WebGPU 3D Visualization',
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
