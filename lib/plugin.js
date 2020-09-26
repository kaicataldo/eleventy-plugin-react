"use strict";

const path = require("path");
const fs = require("fs");
const { addHook } = require("pirates");
const { JSDOM } = require("jsdom");
const hydrationCache = require("./hydrationCache");
const { bundleClientAssets } = require("./clientBundler");
const { requireFromDir } = require("./moduleUtils");
const { APP_ROOT } = require("./constants");

const babel = requireFromDir("@babel/core", APP_ROOT);
const React = requireFromDir("react", APP_ROOT);
const ReactDOM = requireFromDir("react-dom/server", APP_ROOT);
const { Helmet } = requireFromDir("react-helmet", APP_ROOT);

const SUPPORTED_EXTENSIONS = ["js", "jsx"];

function setupBabelHook(babelConfig) {
  return addHook(
    (code, filename) => {
      const { code: compiledCode } = babel.transform(code, {
        filename,
        root: APP_ROOT,
        babelrc: false,
        ...babelConfig,
      });
      return `${compiledCode}\nif (exports.default) exports.default.__modulePath = "${filename}"`;
    },
    {
      exts: SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`),
      ignoreNodeModules: true,
    }
  );
}

function insertComponentsScript(html, assetsPath, hash) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const scriptEls = [
    `hydrated-components-vendors.js`,
    `hydrated-components-${hash}.js`,
  ].map((src) => {
    const scriptEl = document.createElement("script");
    scriptEl.src = `/${assetsPath.replace(/^\.{0,2}\/|\/$/g, "")}/${src}`;
    return scriptEl;
  });
  document.querySelector("body").append(...scriptEls);
  return dom.serialize();
}

function removeHelmetDataAttribute(str) {
  return str.replace('data-react-helmet="true"', "");
}

async function generateHTML(
  bodyContent,
  helmet,
  babelConfig,
  assetsPath,
  configOutputDir,
  inputPath
) {
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
    const hash = await bundleClientAssets({
      outputPath: path.join(APP_ROOT, configOutputDir, assetsPath),
      babelConfig,
      inputPath,
    });
    html = insertComponentsScript(html, assetsPath, hash);
  }

  return html;
}

async function getDataDirData(dirPath) {
  const files = fs.existsSync(dirPath)
    ? await fs.promises.readdir(dirPath)
    : [];

  return files
    .filter((filePath) => filePath.match(/\.js(?:on)?/))
    .map((filePath) => [
      filePath,
      require(path.resolve(dirPath, filePath), "utf8"),
    ])
    .reduce((data, [filePath, fileData]) => {
      data[filePath.replace(/\.js(?:on)?/, "")] = fileData;
      return data;
    }, {});
}

module.exports = function eleventyPluginReact(
  eleventyConfig,
  { babelConfig, assetsPath = "/assets", postProcess = null } = {}
) {
  if (typeof babelConfig !== "function") {
    throw new Error("`babelConfig` is required and must be a function.");
  }

  const extensionOptions = {
    // The module is loaded in the compile method below.
    read: false,
    getData: true,
    getInstanceFromInputPath(inputPath) {
      return requireFromDir(inputPath, APP_ROOT).default;
    },
    compile(_str, inputPath) {
      return async (data) => {
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
          babelConfig({ isBrowser: true }),
          assetsPath,
          this.config.dir.output,
          inputPath
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
  setupBabelHook(babelConfig({ isBrowser: false }));
};
