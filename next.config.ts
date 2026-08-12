import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the Coolify production image small.
  output: "standalone",
  serverExternalPackages: ["@node-rs/argon2", "sharp", "postgres"],
  poweredByHeader: false,
  experimental: {
    serverActions: {
      /**
       * Spec 4.3 allows images up to 5MB. Server Actions default to a 1MB body
       * limit, which would reject a valid upload before our own validation ever
       * saw it. The headroom covers multipart overhead; the real 5MB rule is
       * enforced server-side in lib/images.ts.
       */
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        // Uploaded files are served through a route handler that sets its own
        // Content-Type; these headers make script execution impossible even if
        // a malicious file slipped past validation. (Spec 8.6)
        source: "/uploads/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; sandbox" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Disposition", value: "inline" },
        ],
      },
    ];
  },
};

export default nextConfig;
