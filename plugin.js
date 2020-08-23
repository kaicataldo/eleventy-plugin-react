"use strict";

const { addHook } = require("pirates");
const React = require("react");
const ReactDOM = require("react-dom/server");
const babel = require("@babel/core");
const { bundleClientAssets } = require("./lib/clientBundler");
const { PACKAGE_ROOT, SUPPORTED_EXTENSIONS } = require("./lib/utils/constants");
const generateBabelConfig = require("./lib/utils/babelConfig");
const { loadModuleFromCWD } = require("./lib/utils/moduleUtils");

module.exports = function eleventyPluginReact(eleventyConfig) {
  const revertHook = addHook(
    (code, filename) => {
      const { code: compiledCode } = babel.transform(
        `${code}\nif (exports.default) exports.default.__modulePath = "${filename}"`,
        {
          filename,
          cwd: PACKAGE_ROOT,
          babelrc: false,
          ...generateBabelConfig(),
        }
      );
      return compiledCode;
    },
    {
      exts: SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`),
      ignoreNodeModules: true,
    }
  );

  const extensionOptions = {
    // The module is loaded in the compile method below.
    read: false,
    getData: true,
    getInstanceFromInputPath(inputPath) {
      return loadModuleFromCWD(inputPath).default;
    },
    compile(_str, inputPath) {
      return async function render(data) {
        const componentModule = loadModuleFromCWD(inputPath).default;
        const Component = React.createElement(componentModule, { data }, null);
        const html = ReactDOM.renderToString(Component);
        // Revert module hook after each page is rendered in case this a long-lived process.
        revertHook();
        await bundleClientAssets();
        return html;
      };
    },
  };

  for (const ext of ["js", "jsx"]) {
    eleventyConfig.addTemplateFormats(ext);
    eleventyConfig.addExtension(ext, extensionOptions);
  }
};
