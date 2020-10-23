"use strict";

const pluginTransformRuntime = require("@babel/plugin-transform-runtime");
const presetEnv = require("@babel/preset-env");
const presetReact = require("@babel/preset-react");
const presetTypeScript = require("@babel/preset-typescript");
const pluginModuleResolver = require("babel-plugin-module-resolver");

function generate({ isClientBundle, targets, configHook = null }) {
  const baseConfig = {
    presets: [
      presetTypeScript,
      [
        presetEnv,
        {
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
        pluginTransformRuntime,
        {
          useESModules: isClientBundle,
        },
      ],
      [
        pluginModuleResolver,
        {
          root: ["."],
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
