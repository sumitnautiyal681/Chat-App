import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* existing config options */
  images: {
    domains: [
      "res.cloudinary.com", // if you use Cloudinary for uploads
      "via.placeholder.com", // if you use placeholders
      "cdn-icons-png.flaticon.com" // any other external image sources
    ],
  },
};

export default nextConfig;

