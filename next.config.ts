import type { NextConfig } from "next";
const config: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  poweredByHeader: false,
  experimental: { extensionAlias: { ".js": [".ts", ".tsx", ".js"] } },
  reactStrictMode: true,
  serverExternalPackages: ["pg", "pdfkit", "fontkit"],
  outputFileTracingIncludes: {
    "/api/**": [
      "./migrations/*.sql",
      "./node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
      "./node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
      "./node_modules/@fontsource/inter-tight/files/inter-tight-latin-800-normal.woff",
    ],
  },
  async rewrites() {
    return ["login", "callback", "logout"].map((action) => ({
      source: `/${action}`,
      destination: `/api/auth0/${action}`,
    }));
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/shared/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};
export default config;
