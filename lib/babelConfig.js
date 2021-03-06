"use strict";

const { babelPresetEnv, babelPresetReact } = require("./peerDeps").modules;

function generate({ isClientBundle, targets, configHook = null }) {
  const baseConfig = {
    plugins: [],
    presets: [
      [
        babelPresetEnv,
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
      babelPresetReact,
    ],
  };

  if (configHook && typeof configHook === "function") {
    return configHook({ config: baseConfig, isClientBundle });
  }

  return baseConfig;
}

module.exports = { generate };
