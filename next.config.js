/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Deploying on Vercel: no special config needed. Vercel runs Next.js
  // natively, so we don't use static export or a basePath here (those
  // were only required for GitHub Pages, which can't run a Next.js
  // server and serves the site from a /repo-name/ subpath).
};

module.exports = nextConfig;
