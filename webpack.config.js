const webpack = require("webpack");
const path = require("path");
const LodashModuleReplacementPlugin = require("lodash-webpack-plugin");

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: "./src/web.ts",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: 'web.js',
    },
    // watch: isDev,
    module: {
      rules: [
        {
          test: /\.ts(x)?$/,
          use: ["awesome-typescript-loader"],
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"]
    },
    plugins: [new LodashModuleReplacementPlugin()]
  };
};
