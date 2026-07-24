/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
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
