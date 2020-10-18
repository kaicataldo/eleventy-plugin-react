"use strict";

const babel = require("@babel/core");
const { addHook } = require("pirates");
const { APP_ROOT } = require("./constants");
const compiledFiles = new Set();

function setup(userBabelConfig) {
  return addHook(
    (code, filename) => {
      const { code: compiledCode } = babel.transform(code, {
        filename,
        root: APP_ROOT,
        babelrc: false,
        ...userBabelConfig,
      });
      compiledFiles.add(filename);

      return `${compiledCode}\nif (exports.default) exports.default.__modulePath = "${filename}"`;
    },
    {
      exts: [".js", ".jsx", ".ts", ".tsx"],
      ignoreNodeModules: true,
    }
  );
}

function flushCache() {
  for (const filePath of Array.from(compiledFiles.values())) {
    delete require.cache[require.resolve(filePath)];
  }

  compiledFiles.clear();
}

module.exports = {
  setup,
  flushCache,
};
