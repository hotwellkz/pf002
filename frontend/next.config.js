/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // Исключаем undici из клиентского бандла (он используется только на сервере)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        undici: false,
      };
    }
    return config;
  },
  // Для серверных компонентов - исключаем undici из обработки
  experimental: {
    serverComponentsExternalPackages: ['undici'],
  },
  // Для Netlify
  output: 'standalone',
}

module.exports = nextConfig

