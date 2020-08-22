"use strict";

const path = require("path");
const { addHook } = require("pirates");
const React = require("react");
const ReactDOM = require("react-dom/server");
const babel = require("@babel/core");
const babelConfig = require("./babelConfig");
const hydrationCache = require("../hydration/hydrationCache");

const PACKAGE_ROOT = path.resolve(__dirname, "../..");

function resolveModuleFromCWD(moduleToResolve) {
  return require.resolve(moduleToResolve, { paths: [process.cwd()] });
}

function loadModuleFromCWD(modulePath) {
  // TODO: Babel doesn't transform the `require` statements. Figure out module interop when using CommonJS in source code.
  // loadedModule.__esModule === true ? loadedModule.default : loadedModule;
  return require(resolveModuleFromCWD(modulePath));
}

function buildClientAssets(components) {
  console.log(components);
}

module.exports = function eleventyPluginReact(eleventyConfig) {
  const revertHook = addHook(
    (code, filename) => {
      const { code: compiledCode } = babel.transform(
        `const React = require(require.resolve('react', { paths: ["${PACKAGE_ROOT}"] }));\n${code}\nexports.default.__modulePath = "${filename}"`,
        {
          filename,
          cwd: PACKAGE_ROOT,
          babelrc: false,
          ...babelConfig,
        }
      );
      return compiledCode;
    },
    { exts: [".jsx"], ignoreNodeModules: false }
  );

  eleventyConfig.addTemplateFormats("jsx");
  eleventyConfig.addExtension("jsx", {
    // The module is loaded in the compile method below.
    read: false,
    getData: true,
    getInstanceFromInputPath(inputPath) {
      return loadModuleFromCWD(inputPath).default;
    },
    compile(_str, inputPath) {
      return function render(data) {
        const componentModule = loadModuleFromCWD(inputPath).default;
        const Component = React.createElement(componentModule, { data }, null);
        const html = ReactDOM.renderToString(Component);

        // Revert module hook after each page is rendered in case this a long-lived process.
        revertHook();

        // Build client-side assets for partial hydration.
        const components = hydrationCache.getComponents();
        buildClientAssets(components);
        hydrationCache.flush();

        return html;
      };
    },
  });
};
