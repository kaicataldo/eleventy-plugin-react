"use strict";

const path = require("path");
const { addHook } = require("pirates");
const babel = require("@babel/core");
const { JSDOM } = require("jsdom");
const hydrationCache = require("./hydrationCache");
const { bundleClientAssets } = require("./clientBundler");
const { requireFromDir } = require("./moduleUtils");
const { PACKAGE_ROOT, APP_ROOT } = require("./constants");

const SUPPORTED_EXTENSIONS = ["js", "jsx"];

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
      return `${compiledCode}\nif (exports.default) exports.default.__modulePath = "${filename}"`;
    },
    {
      exts: SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`),
      ignoreNodeModules: true,
    }
  );
}

function insertComponentsScript(html, hash) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const scriptEl = document.createElement("script");
  scriptEl.src = `./assets/hydrated-components-${hash}.js`;
  document.querySelector("body").append(scriptEl);
  return dom.serialize();
}

module.exports = function eleventyPluginReact(
  eleventyConfig,
  { targets = {}, outputPath = path.resolve(APP_ROOT, "_site/assets") } = {}
) {
  const React = requireFromDir("react", APP_ROOT);
  const ReactDOM = requireFromDir("react-dom/server", APP_ROOT);

  const extensionOptions = {
    // The module is loaded in the compile method below.
    read: false,
    getData: true,
    getInstanceFromInputPath(inputPath) {
      return requireFromDir(inputPath, APP_ROOT).default;
    },
    compile(_str, inputPath) {
      return async function render(data) {
        const componentExport = requireFromDir(inputPath, APP_ROOT).default;
        const Component = React.createElement(componentExport, data, null);
        let html = ReactDOM.renderToString(Component);

        if (hydrationCache.hasComponents()) {
          const hash = await bundleClientAssets({ targets, outputPath });
          html = insertComponentsScript(html, hash);
        }

        return html;
      };
    },
  };

  for (const ext of ["js", "jsx"]) {
    eleventyConfig.addTemplateFormats(ext);
    eleventyConfig.addExtension(ext, extensionOptions);
  }

  setupBabelHook();
};
