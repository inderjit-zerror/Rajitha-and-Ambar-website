/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  turbopack: {},
  webpack(config) {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ['raw-loader', 'glslify-loader'],
    });
    return config;
  },
  reactCompiler: true,
  // The .woff files of the 3D text are fetched by troika on every visit. Let
  // browsers keep them for a while instead of revalidating them each time.
  async headers() {
    return [
      {
        source: '/fonts/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=31536000' }],
      },
    ];
  },
};

export default nextConfig;
