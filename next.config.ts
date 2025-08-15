import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Get path module first
      const path = require('path');
      
      // Aggressive worker thread prevention
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'child_process': false,
        'cluster': false,
      };

      // Comprehensive alias mapping to prevent worker loading
      config.resolve.alias = {
        ...config.resolve.alias,
        // Worker thread modules - use our polyfill
        "worker_threads": path.resolve(process.cwd(), 'worker-threads-polyfill.js'),
        // JSZip worker patterns - use our polyfill
        "./stream/GenericWorker": path.resolve(__dirname, 'lib/stream/GenericWorker.js'),
        "stream/GenericWorker": path.resolve(__dirname, 'lib/stream/GenericWorker.js'),
        "jszip/lib/stream/GenericWorker": path.resolve(__dirname, 'lib/stream/GenericWorker.js'),
        // OpenAI worker patterns
        "openai/lib/worker": false,
        "openai/lib/worker.js": false,
        "openai/dist/lib/worker": false,
        "openai/dist/lib/worker.js": false,
        // Generic worker patterns
        "lib/worker": false,
        "lib/worker.js": false,
        "./lib/worker": false,
        "./lib/worker.js": false,
        "../lib/worker": false,
        "../lib/worker.js": false,
        "*/lib/worker": false,
        "*/lib/worker.js": false,
      };
      const originalExternals = config.externals || [];
      config.externals = originalExternals;

      // Ignore worker-related modules with comprehensive patterns
      const webpack = require('webpack');
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /(worker|Worker)/,
          contextRegExp: /(openai|lib|jszip|stream)/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /worker_threads/,
        }),
        new webpack.IgnorePlugin({
          resourceRegExp: /GenericWorker/,
        }),
        new webpack.DefinePlugin({
          'process.env.OPENAI_DISABLE_WORKER_THREADS': JSON.stringify('true'),
          'global.Worker': 'undefined',
          'global.MessageChannel': 'undefined',
        }),
        // Replace worker_threads with our polyfill
        new webpack.NormalModuleReplacementPlugin(
          /^worker_threads$/,
          path.resolve(process.cwd(), 'worker-threads-polyfill.js')
        )
      );
    }

    return config;
  },
  // Environment variables to disable workers
  env: {
    OPENAI_DISABLE_WORKER_THREADS: 'true',
  },
};

export default nextConfig;
