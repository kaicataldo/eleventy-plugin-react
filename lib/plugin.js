"use strict";

const path = require("path");
const fs = require("fs").promises;
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

function removeHelmetDataAttribute(str) {
  return str.replace('data-react-helmet="true"', "");
}

async function generateHTML(bodyContent, helmet, targets, outputDir) {
  let html = `
    <!doctype html>
      <html ${removeHelmetDataAttribute(helmet.htmlAttributes.toString())}>
      <head>
        ${removeHelmetDataAttribute(helmet.title.toString())}
        ${removeHelmetDataAttribute(helmet.meta.toString())}
        ${removeHelmetDataAttribute(helmet.link.toString())}
      </head>
      <body ${removeHelmetDataAttribute(helmet.bodyAttributes.toString())}>
        <div id="content">
          ${bodyContent}
        </div>
      </body>
    </html>
  `;

  if (hydrationCache.hasComponents()) {
    const hash = await bundleClientAssets({ targets, outputDir });
    html = insertComponentsScript(html, hash);
  }

  return html;
}

async function getDataDirData(dirPath) {
  const files = await fs.readdir(dirPath);
  const data = files
    .filter((filePath) => filePath.match(/\.js(?:on)?/))
    .map((filePath) => [
      filePath,
      require(path.resolve(dirPath, filePath), "utf8"),
    ])
    .reduce((data, [filePath, fileData]) => {
      data[filePath.replace(/\.js(?:on)?/, "")] = fileData;
      return data;
    }, {});
  return data;
}

module.exports = function eleventyPluginReact(
  eleventyConfig,
  {
    targets = {},
    outputDir = path.resolve(APP_ROOT, "_site/assets"),
    postProcess = null,
  } = {}
) {
  const React = requireFromDir("react", APP_ROOT);
  const ReactDOM = requireFromDir("react-dom/server", APP_ROOT);
  const { Helmet } = requireFromDir("react-helmet", APP_ROOT);

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
        const dataDirData = await getDataDirData(
          path.resolve(process.cwd(), this.config.dir.data)
        );
        const mergedData = {
          filters: this.config.javascriptFunctions,
          ...data,
          ...dataDirData,
        };
        const Component = React.createElement(
          componentExport,
          mergedData,
          null
        );
        const bodyContent = ReactDOM.renderToString(Component);
        const helmet = Helmet.renderStatic();
        const html = await generateHTML(
          bodyContent,
          helmet,
          targets,
          outputDir
        );

        if (typeof postProcess === "function") {
          return postProcess(html);
        }

        return html;
      };
    },
  };

  for (const ext of ["js", "jsx"]) {
    eleventyConfig.addTemplateFormats(ext);
    eleventyConfig.addExtension(ext, extensionOptions);
  }

  // TODO: When released, use beforeBuild and afterBuild to revert
  // this hook for long-lived processes.
  // https://www.11ty.dev/docs/events/
  setupBabelHook();
};
