import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For the Docker image (Step 8); ignored by Vercel, which uses its own
  // build output.
  output: "standalone",
  // The content loader reads /content with dynamic fs paths the build tracer
  // cannot follow, so the question banks must be included explicitly for the
  // serverless bundle on Vercel ("/**" matches every route).
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
};

export default nextConfig;
