import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  outputFileTracingIncludes: {
    "/api/**/*": ["./prompt/**/*"],
  },
};

export default nextConfig;
