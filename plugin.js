"use strict";

const { addHook } = require("pirates");
const React = require("react");
const ReactDOM = require("react-dom/server");
const babel = require("@babel/core");
const { bundleClientAssets } = require("./lib/clientBundler");
const { PACKAGE_ROOT, SUPPORTED_EXTENSIONS } = require("./lib/utils/constants");
const generateBabelConfig = require("./lib/utils/babelConfig");
const { loadModuleFromCWD } = require("./lib/utils/moduleUtils");

function setupBabelHook() {
  return addHook(
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
}

function createPage(content, hash) {
  return `
      <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body>
            <div>${content}</div>
            <script src="./assets/hydrated-components-${hash}.js"></script>
        </body>
        </html>
    `.trim();
}

module.exports = function eleventyPluginReact(eleventyConfig) {
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

        let hash;
        try {
          hash = await bundleClientAssets();
        } catch (e) {
          console.error(`Could not bundle client assets. Error: ${e.message}`);
        }

        return createPage(html, hash);
      };
    },
  };

  for (const ext of ["js", "jsx"]) {
    eleventyConfig.addTemplateFormats(ext);
    eleventyConfig.addExtension(ext, extensionOptions);
  }

  setupBabelHook();
};
