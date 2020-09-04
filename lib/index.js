"use strict";

const path = require("path");
const { addHook } = require("pirates");

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const SUPPORTED_EXTENSIONS = ["js", "jsx"];

function resolveFromCWD(moduleToResolve) {
  return require.resolve(moduleToResolve, { paths: [process.cwd()] });
}

function requireFromCWD(modulePath) {
  return require(resolveFromCWD(modulePath));
}

function generateDefaultBabelConfig() {
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

function setupBabelHook(useCustomBabelConfig) {
  const babel = requireFromCWD("@babel/core");

  return addHook(
    (code, filename) => {
      const { code: compiledCode } = babel.transform(code, {
        filename,
        cwd: useCustomBabelConfig ? process.cwd() : PACKAGE_ROOT,
        ...(useCustomBabelConfig ? {} : generateDefaultBabelConfig()),
      });
      return compiledCode;
    },
    {
      exts: SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`),
      ignoreNodeModules: true,
    }
  );
}

module.exports = function eleventyPluginReact(
  eleventyConfig,
  { useCustomBabelConfig = false } = {}
) {
  const React = requireFromCWD("react");
  const ReactDOM = requireFromCWD("react-dom");

  const extensionOptions = {
    // The module is loaded in the compile method below.
    read: false,
    getData: true,
    getInstanceFromInputPath(inputPath) {
      return requireFromCWD(inputPath).default;
    },
    compile(_str, inputPath) {
      return async function render(data) {
        const componentModule = requireFromCWD(inputPath).default;
        const Component = React.createElement(componentModule, { data }, null);
        return ReactDOM.renderToString(Component);
      };
    },
  };

  for (const ext of ["js", "jsx"]) {
    eleventyConfig.addTemplateFormats(ext);
    eleventyConfig.addExtension(ext, extensionOptions);
  }

  setupBabelHook(useCustomBabelConfig);
};
