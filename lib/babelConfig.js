"use strict";

const presetEnv = require("@babel/preset-env");
const presetReact = require("@babel/preset-react");
const presetTypeScript = require("@babel/preset-typescript");

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
  };

  if (configHook && typeof configHook === "function") {
    return configHook({ config: baseConfig, isClientBundle });
  }

  return baseConfig;
}

module.exports = { generate };
