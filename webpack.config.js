const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const packageJson = require("./package.json");

const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
const searchServiceUrl = process.env.SEARCH_URL || "http://localhost:8088";
const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || "development";
const sentryRelease = process.env.SENTRY_RELEASE || `arisfront@${packageJson.version}`;
const sentryDebug = process.env.SENTRY_DEBUG === "true";
const sentryTracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1");
const sentryReplaysSessionSampleRate = Number(
  process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE || "0.05",
);
const sentryReplaysOnErrorSampleRate = Number(
  process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || "1",
);

class AssetManifestPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap("AssetManifestPlugin", (compilation) => {
      const { Compilation, sources } = compiler.webpack;

      compilation.hooks.processAssets.tap(
        {
          name: "AssetManifestPlugin",
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        (assets) => {
          const assetPaths = Object.keys(assets)
            .filter(
              (name) =>
                name === "index.html" ||
                /\.(js|css|png|jpe?g|svg|ico|gif|webp|woff2?)$/i.test(name),
            )
            .map((name) => `/${name}`);

          const manifest = JSON.stringify(
            {
              assets: Array.from(new Set(["/", "/index.html", ...assetPaths])).sort(),
            },
            null,
            2,
          );

          compilation.emitAsset("asset-manifest.json", new sources.RawSource(manifest));
        },
      );
    });
  }
}

/** @type {import('webpack').Configuration} */
module.exports = {
  mode: "development",

  entry: "./src/main.ts",

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.[contenthash].js",
    clean: true,
    publicPath: "/",
  },

  devtool: "eval-cheap-module-source-map",

  performance: {
    hints: false,
  },

  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.scss$/i,
        use: ["style-loader", "css-loader", "postcss-loader", "sass-loader"],
      },
    ],
  },

  resolve: {
    alias: {
      "@aris/router": path.resolve(__dirname, "packages/router/src/index.ts"),
      "@aris/offline": path.resolve(__dirname, "packages/offline/src/index.ts"),
    },
    extensions: [".ts", ".js"],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      runtimeConfig: {
        sentryDsn: process.env.SENTRY_DSN || "",
        sentryEnvironment,
        sentryRelease,
        sentryDebug,
        sentryTracesSampleRate,
        sentryReplaysSessionSampleRate,
        sentryReplaysOnErrorSampleRate,
      },
    }),
    new AssetManifestPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "public/sw.js"),
          to: "sw.js",
        },
        {
          from: path.resolve(__dirname, "public/robots.txt"),
          to: "robots.txt",
        },
        {
          from: path.resolve(__dirname, "public/sitemap.xml"),
          to: "sitemap.xml",
        },
        {
          from: path.resolve(__dirname, "public/manifest.webmanifest"),
          to: "manifest.webmanifest",
        },
        {
          from: path.resolve(__dirname, "public/offline.html"),
          to: "offline.html",
        },
        {
          from: path.resolve(__dirname, "public/assets/img"),
          to: "assets/img",
          globOptions: { ignore: ["**/.DS_Store"] },
        },
      ],
    }),
  ],

  devServer: {
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    static: {
      directory: path.resolve(__dirname, "public"),
    },
    historyApiFallback: true,
    port: 3001,
    open: process.env.WEBPACK_OPEN === "true",
    proxy: [
      {
        context: ["/api/search"],
        target: searchServiceUrl,
        changeOrigin: true,
      },
      {
        context: ["/api", "/image-proxy", "/media"],
        target: backendUrl,
        changeOrigin: true,
      },
      {
        context: ["/ws/"],
        target: backendUrl,
        changeOrigin: true,
        ws: true,
      },
    ],
  },
};
