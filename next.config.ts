import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ibyutzpibfuejzzvktow.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "89.46.217.161",
        port: "8000",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "clickcars.ir",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
