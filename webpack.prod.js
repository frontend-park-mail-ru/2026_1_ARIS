const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";

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
  mode: "production",

  entry: "./src/main.ts",

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.[contenthash].js",
    chunkFilename: "[name].[contenthash].js",
    clean: true,
    publicPath: "/",
  },

  devtool: false,

  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
      },
      {
        test: /\.scss$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader", "sass-loader"],
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

  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          },
        },
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        vendor: {
          test: /[\\/]packages[\\/]/,
          name: "vendor",
          chunks: "all",
          priority: 10,
        },
      },
    },
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: "styles.[contenthash].css",
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
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
          from: path.resolve(__dirname, "public/assets/img"),
          to: "assets/img",
          globOptions: { ignore: ["**/.DS_Store"] },
        },
      ],
    }),
  ],
};
