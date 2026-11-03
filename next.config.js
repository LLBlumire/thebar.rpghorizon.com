/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // Keep static generation within the shared build budget.
  experimental: { cpus: 2 },
}

module.exports = nextConfig
