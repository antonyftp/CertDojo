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
  experimental: {
    serverActions: {
      // Next defaults to 1MB, which is below the app-level import guard in
      // settings/actions.ts — a 1-2MB backup would have been rejected by the
      // framework with a generic error before the friendly message could fire.
      // Kept deliberately above MAX_IMPORT_BYTES so the app-level check is
      // always the one users hit, with room for multipart overhead.
      bodySizeLimit: "4mb",
    },
  },
  // Defence in depth for publicly deployed instances (Vercel). CertDojo is
  // zero-auth by design, so a public instance is readable by anyone who knows
  // the URL — but it should at least not be frameable by a third party.
  // Note: script-src/style-src are deliberately NOT restricted here. Next
  // injects inline bootstrap scripts, so a strict script-src needs
  // nonce-based CSP wired through middleware; the directives below are the
  // ones that are both high-value and safe to apply statically.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
          {
            // No effect in Local mode over plain HTTP; applies once the app is
            // served over TLS (Vercel terminates it at the edge).
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
