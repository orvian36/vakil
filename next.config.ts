import type { NextConfig } from "next";
import nextMdx from '@next/mdx';

const withMDX = nextMdx({
  extension: /\.mdx?$/,
});

const nextConfig: NextConfig = {
  reactStrictMode: false,
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx","mjs"],
  webpack: (config) => {
    // Ensure proper handling of .mjs files
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts"],
      ".jsx": [".jsx", ".tsx"],
      ".mjs": [".mjs", ".js"],
    };
    return config;
  },
  async headers() {
    return [
      {
        // Apply CORS headers to the worker file
        source: '/pdf.worker.mjs',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};
export default withMDX(nextConfig);


