"use strict";

const presetEnv = require("@babel/preset-env");
const presetReact = require("@babel/preset-react");
const presetTypeScript = require("@babel/preset-typescript");
const pluginModuleResolver = require("babel-plugin-module-resolver");

function generate({
  isBrowser,
  targets,
  config: { presets, plugins } = { presets: [], plugins: [] },
}) {
  return {
    presets: [
      presetTypeScript,
      [
        presetEnv,
        {
          modules: isBrowser ? false : "commonjs",
          targets: isBrowser
            ? targets
            : {
                node: process.versions.node,
              },
        },
      ],
      presetReact,
      ...presets,
    ],
    plugins: [
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
      ...plugins,
    ],
  };
}

module.exports = { generate };
