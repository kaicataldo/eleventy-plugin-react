"use strict";

const presetEnv = require("@babel/preset-env");
const presetReact = require("@babel/preset-react");
const presetTypeScript = require("@babel/preset-typescript");
const pluginModuleResolver = require("babel-plugin-module-resolver");
const { PACKAGE_ROOT } = require("./constants");

function generate({ isClientBundle, targets, configHook = null }) {
  const baseConfig = {
    presets: [
      presetTypeScript,
      [
        presetEnv,
        {
          useBuiltIns: "entry",
          corejs: 3,
          modules: isClientBundle ? false : "commonjs",
          targets: isClientBundle
            ? targets
            : {
                node: process.versions.node,
              },
        },
      ],
      presetReact,
    ],
    plugins: [
      [
        pluginModuleResolver,
        {
          root: [PACKAGE_ROOT],
          alias: {
            react: require.resolve("react"),
            "react-helmet": require.resolve("react-helmet"),
          },
        },
      ],
    ],
  };

  if (configHook && typeof configHook === "function") {
    return configHook({ config: baseConfig, isClientBundle });
  }

  return baseConfig;
}

module.exports = { generate };
