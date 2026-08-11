import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/cases/michael-bargo-testing",
        destination: "/cases/michael-bargo",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;