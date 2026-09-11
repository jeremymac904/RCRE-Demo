/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // FUB credentials and DB URLs are server-only. Nothing sensitive is ever
  // exposed via NEXT_PUBLIC_*. See src/lib/config/env.ts.
  serverExternalPackages: ['pg'],
}
export default nextConfig
