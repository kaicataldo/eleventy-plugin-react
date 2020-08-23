"use strict";

const path = require("path");
const webpack = require("webpack");
const VirtualModulesPlugin = require("webpack-virtual-modules");
const hydrationCache = require("./hydrationCache");
const { PACKAGE_ROOT } = require("./utils/constants");
const generateBabelConfig = require("./utils/babelConfig");

function generateEntryFile(components) {
  // TODO: Add hydrating logic to entrypoint file.
  return Object.values(components)
    .map((val) => `import ${val.name} from "${val.modulePath}"`)
    .join("\n");
}

function promisifiedWebpack(config) {
  return new Promise((resolve, reject) => {
    console.info("Beginning bundling of hydrated components.");
    webpack(config, (err, stats) => {
      if (err || stats.hasErrors()) {
        reject(err);
      }

      if (stats.hasWarnings()) {
        const info = stats.toJson();
        console.warn(info.warnings);
      }

      console.info(stats.toString());
      resolve();
    });
  });
}

async function bundleClientAssets() {
  const virtualEntryFilepath = path.resolve(
    PACKAGE_ROOT,
    "lib/virtual-entrypoint.js"
  );
  const webpackConfig = {
    target: "web",
    mode: "development",
    entry: virtualEntryFilepath,
    output: {
      filename: "hydrated-components-[hash].js",
      path: path.resolve(process.cwd(), "_site/assets"),
    },
    plugins: [
      new VirtualModulesPlugin({
        [virtualEntryFilepath]: generateEntryFile(
          hydrationCache.getComponents()
        ),
      }),
    ],
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: require.resolve("babel-loader", { paths: [PACKAGE_ROOT] }),
            options: {
              cwd: PACKAGE_ROOT,
              babelrc: false,
              ...generateBabelConfig({ compileModules: false }),
            },
          },
        },
      ],
    },
  };
  try {
    await promisifiedWebpack(webpackConfig);
  } catch (e) {
    console.error("Bundling of hydrated components failed.");
    throw e;
  } finally {
    hydrationCache.flush();
  }
}

module.exports = {
  bundleClientAssets,
};
