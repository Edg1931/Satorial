/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep better-sqlite3 (native module) outside the bundle so its prebuilt
  // .node binary is loaded from node_modules at runtime instead of being
  // traced/inlined.
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  // Ensure the better-sqlite3 native binary is included in serverless bundles.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/better-sqlite3/**/*.node"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({ "better-sqlite3": "commonjs better-sqlite3" });
    }
    return config;
  },
};

module.exports = nextConfig;
