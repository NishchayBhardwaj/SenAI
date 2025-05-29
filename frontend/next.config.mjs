/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Default Redis configuration for development
    NEXT_PUBLIC_UPSTASH_REDIS_REST_URL:
      process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL ||
      "https://us1-settling-worm-38511.upstash.io",
    NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN:
      process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN ||
      "AZgmASQgMTMxZDI5OTQtZjI0My00NWUyLTg4ZWItMDQwYTBlZTY5OTA4YTBiZDM4MTA5NTYzNDY2ZTk2NmNjYTg3ZTYzMGEwZmE=",
  },
  reactStrictMode: false,
  images: {
    domains: ["localhost"],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
