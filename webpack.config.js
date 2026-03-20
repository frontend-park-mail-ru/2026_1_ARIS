const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/main.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.[contenthash].js",
    clean: true,
    publicPath: "/",
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
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
    extensions: [".js"],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "public/assets/img"),
          to: "assets/img",
        },
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.resolve(__dirname, "public"),
    },
    historyApiFallback: true,
    port: 3001,
    open: true,
    proxy: [
      {
        context: ["/api", "/image-proxy"],
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    ],
  },
};
