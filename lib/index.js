"use strict";

const path = require("path");
const { addHook } = require("pirates");
const babel = require("@babel/core");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const SUPPORTED_EXTENSIONS = ["js", "jsx"];

function resolveFromCWD(moduleToResolve) {
  return require.resolve(moduleToResolve, { paths: [process.cwd()] });
}

function requireFromCWD(modulePath) {
  return require(resolveFromCWD(modulePath));
}

function generateBabelConfig() {
  return {
    babelrc: false,
    presets: [
      "@babel/preset-react",
      [
        "@babel/preset-env",
        {
          modules: "commonjs",
          targets: {
            node: process.versions.node,
          },
        },
      ],
    ],
  };
}

function setupBabelHook() {
  return addHook(
    (code, filename) => {
      const { code: compiledCode } = babel.transform(code, {
        filename,
        cwd: PACKAGE_ROOT,
        babelrc: false,
        ...generateBabelConfig(),
      });
      return compiledCode;
    },
    {
      exts: SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`),
      ignoreNodeModules: true,
    }
  );
}

module.exports = function eleventyPluginReact(eleventyConfig) {
  const React = requireFromCWD("react");
  const ReactDOM = requireFromCWD("react-dom/server");

  const extensionOptions = {
    // The module is loaded in the compile method below.
    read: false,
    getData: true,
    getInstanceFromInputPath(inputPath) {
      return requireFromCWD(inputPath).default;
    },
    compile(_str, inputPath) {
      return async function render(data) {
        const componentExport = requireFromCWD(inputPath).default;
        const Component = React.createElement(componentExport, data, null);
        return ReactDOM.renderToString(Component);
      };
    },
  };

  for (const ext of ["js", "jsx"]) {
    eleventyConfig.addTemplateFormats(ext);
    eleventyConfig.addExtension(ext, extensionOptions);
  }

  setupBabelHook();
};
