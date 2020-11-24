"use strict";

const { resolveFromDir, requireFromDir } = require("./moduleUtils");
const { APP_ROOT } = require("./constants");

module.exports = {
  modules: {
    babel: requireFromDir("@babel/core", APP_ROOT),
    babelPresetEnv: requireFromDir("@babel/preset-env", APP_ROOT),
    babelPresetReact: requireFromDir("@babel/preset-react", APP_ROOT),
    babelPresetTypeScript: requireFromDir("@babel/preset-typescript", APP_ROOT),
    React: requireFromDir("react", APP_ROOT),
    ReactDOM: requireFromDir("react-dom/server", APP_ROOT),
  },
  paths: {
    babelLoader: resolveFromDir("babel-loader", APP_ROOT),
    react: resolveFromDir("react", APP_ROOT),
    reactDom: resolveFromDir("react-dom", APP_ROOT),
  },
};
