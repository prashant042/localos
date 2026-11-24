/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@localos/types', '@localos/utils', '@localos/config', '@localos/ui'],
};

export default nextConfig;

