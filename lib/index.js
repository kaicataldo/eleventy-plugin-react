"use strict";

const addHook = require("pirates").addHook;

function resolveModuleFromCWD(moduleToResolve) {
  return require.resolve(moduleToResolve, { paths: [process.cwd()] });
}

function loadModuleFromCWD(modulePath) {
  // TODO: Babel doesn't transform the `require` statements. Figure out module interop when using CommonJS in source code.
  // loadedModule.__esModule === true ? loadedModule.default : loadedModule;
  return require(resolveModuleFromCWD(modulePath));
}

let React;
let ReactDOM;
let babel;

try {
  React = require(resolveModuleFromCWD("react"));
  ReactDOM = require(resolveModuleFromCWD("react-dom/server"));
  babel = require(resolveModuleFromCWD("@babel/core"));
} catch {
  throw new Error(
    "Please ensure that all peerDependencies are installed in your project."
  );
}

module.exports = function eleventyPluginReact(eleventyConfig, options = {}) {
  const { ext = "jsx", injectImport = true } = options;
  const revertHook = addHook(
    (code, filename) => {
      const { code: compiledCode } = babel.transform(
        `${injectImport ? "import React from 'react';\n" : ""}${code}`,
        {
          filename,
          cwd: process.cwd(),
        }
      );
      return compiledCode;
    },
    { exts: [`.${ext}`], ignoreNodeModules: false }
  );

  eleventyConfig.on("afterBuild", () => {
    revertHook();
  });

  eleventyConfig.addTemplateFormats(ext);
  eleventyConfig.addExtension(ext, {
    // We load the module in the compile method below.
    read: false,
    getData: true,
    getInstanceFromInputPath(inputPath) {
      return loadModuleFromCWD(inputPath);
    },
    compile(_str, inputPath) {
      return function render(data) {
        const componentModule = loadModuleFromCWD(inputPath);
        const Component = React.createElement(componentModule, { data }, null);
        return ReactDOM.renderToString(Component);
      };
    },
  });
};
