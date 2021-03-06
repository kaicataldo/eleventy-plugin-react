"use strict";

const { addHook } = require("pirates");
const { babel } = require("./peerDeps").modules;
const { APP_ROOT } = require("./constants");
const { normalizeExtension } = require("./stringUtils");

const compiledFiles = new Set();

function setup(userBabelConfig, exts) {
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
      exts: exts.map((ext) => normalizeExtension(ext, true)),
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
