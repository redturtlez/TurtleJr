// @ts-check

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  images: {
    // Serve AVIF/WebP to browsers that support them; the optimizer caches results for 30 days.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  async headers() {
    // Static card-creator assets use stable filenames, so cache for a day and
    // revalidate in the background rather than marking them immutable.
    const staticAssetCache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      { source: "/card-creator/fonts/:path*", headers: staticAssetCache },
      { source: "/card-creator/normal/:path*", headers: staticAssetCache },
      { source: "/pokemon-card-creator/:path*", headers: staticAssetCache },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },

  // Turbopack (the default bundler in Next 16): import .svg files as React components.
  turbopack: {
    rules: {
      "*.svg": {
        loaders: [{ loader: "@svgr/webpack", options: { icon: true } }],
        as: "*.js",
      },
    },
  },

  // Fallback for `next build --webpack` / `next dev --webpack`. Known limitation: under webpack,
  // SVGs imported through public/svg.tsx only work from client components (e.g. add "use client"
  // back to app/home/home.tsx). Turbopack handles them everywhere.
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [{ loader: "@svgr/webpack", options: { icon: true } }],
    });

    return config;
  },
};

export default nextConfig;
