"use strict";

const path = require("path");
const { addHook } = require("pirates");
const babel = require("@babel/core");
const dedent = require("dedent");
const hydrationCache = require("./hydrationCache");
const { bundleClientAssets } = require("./clientBundler");
const { requireFromDir } = require("./moduleUtils");
const { PACKAGE_ROOT } = require("./constants");

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

// TODO: Figure out how to get this to work with user-defined layouts. Parse html and insert?
function createPage(content, hasComponents, hash) {
  return dedent(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body>
      <div>${content}</div>
      ${
        hasComponents
          ? `<script src="./assets/hydrated-components-${hash}.js"></script>`
          : ""
      }
    </body>
    </html>
  `).trim();
}

module.exports = function eleventyPluginReact(
  eleventyConfig,
  {
    targets = {},
    outputPath = path.resolve(process.cwd(), "_site/assets"),
  } = {}
) {
  const React = requireFromDir("react", process.cwd());
  const ReactDOM = requireFromDir("react-dom/server", process.cwd());

  const extensionOptions = {
    // The module is loaded in the compile method below.
    read: false,
    getData: true,
    getInstanceFromInputPath(inputPath) {
      return requireFromDir(inputPath, process.cwd()).default;
    },
    compile(_str, inputPath) {
      return async function render(data) {
        const componentExport = requireFromDir(inputPath, process.cwd())
          .default;
        const Component = React.createElement(componentExport, data, null);
        const html = ReactDOM.renderToString(Component);
        const hasComponents = hydrationCache.hasComponents();
        const hash = await bundleClientAssets({ targets, outputPath });

        return createPage(html, hasComponents, hash);
      };
    },
  };

  for (const ext of ["js", "jsx"]) {
    eleventyConfig.addTemplateFormats(ext);
    eleventyConfig.addExtension(ext, extensionOptions);
  }

  setupBabelHook();
};
