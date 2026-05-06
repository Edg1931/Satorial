/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // libsql client is pure JS — no native module bundling concerns.
};

module.exports = nextConfig;
