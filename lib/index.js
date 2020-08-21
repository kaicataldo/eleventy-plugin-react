"use strict";

const path = require("path");
const addHook = require("pirates").addHook;

function resolvedModuleFromCWD(moduleToResolve) {
  return require.resolve(moduleToResolve, { paths: [process.cwd()] });
}

let React;
let ReactDOM;
let babel;

try {
  React = require(resolvedModuleFromCWD("react"));
  ReactDOM = require(resolvedModuleFromCWD("react-dom/server"));
  babel = require(resolvedModuleFromCWD("@babel/core"));
} catch {
  throw new Error(
    "Please ensure that all peerDependencies are installed in your project."
  );
}

module.exports = function eleventyPluginReact(eleventyConfig, options = {}) {
  const { extension = "jsx" } = options;
  const revert = addHook(
    (code, filename) => {
      const { code: compiledCode } = babel.transform(
        `import React from 'react';\n${code}`,
        {
          filename,
          cwd: process.cwd(),
        }
      );
      return compiledCode;
    },
    { exts: [`.${extension}`], ignoreNodeModules: false }
  );

  eleventyConfig.on("afterBuild", () => {
    // Restore any existing loaders
    revert();
  });

  eleventyConfig.addTemplateFormats(extension);
  eleventyConfig.addExtension(extension, {
    read: false,
    getData: true,
    getInstanceFromInputPath(inputPath) {
      return require(path.resolve(process.cwd(), inputPath)).default;
    },
    compile(_str, inputPath) {
      return function (data) {
        const componentModule = require(path.resolve(process.cwd(), inputPath))
          .default;
        const Component = React.createElement(componentModule, { data }, null);
        return ReactDOM.renderToString(Component);
      };
    },
  });
};
