"use strict";

module.exports = function generateBabelConfig({ compileModules = true } = {}) {
  return {
    presets: [
      "@babel/preset-react",
      [
        "@babel/preset-env",
        {
          modules: compileModules ? "commonjs" : false,
          targets: {
            node: "12",
          },
        },
      ],
    ],
  };
};
