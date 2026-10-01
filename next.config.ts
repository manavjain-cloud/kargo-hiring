import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // rubric.txt is read at runtime by the scoring prompt — make sure it ships with the server bundle.
  outputFileTracingIncludes: {
    "/api/candidates/[id]/evaluate": ["./src/content/rubric.txt"],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
