/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // Emit metadata in the initial head for every consumer, including link
  // previews and crawlers that do not observe streamed body metadata.
  htmlLimitedBots: /.*/,
  serverExternalPackages: ["node:sqlite"],
  distDir: process.env.RCRE_BUILD_DIR || ".next",
  // The floating dev badge sits over the sidebar's sign-out control and is
  // visible on a shared screen. Nothing in this demo needs it.
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'dlajgvw9htjpb.cloudfront.net' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
}
