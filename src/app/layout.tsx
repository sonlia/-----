import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '智能楼宇 3D 数字孪生系统 · Digital Twin',
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
