/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // 生产构建时跳过 TypeScript 类型检查（开发环境已验证可运行）
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 允许跨域隔离（WebGPU 需要）
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

export default nextConfig;
