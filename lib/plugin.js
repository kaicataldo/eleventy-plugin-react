"use strict";

const path = require("path");
const { promises: fs } = require("fs");
const { addHook } = require("pirates");
const { JSDOM } = require("jsdom");
const dedent = require("dedent");
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

function insertComponentsScript(html, assets, assetsPath) {
  const dom = new JSDOM(html);
  const { document } = dom.window;

  // This page doesn't have any components to hydrate
  if (!document.querySelectorAll("[data-hydration-start-id]").length) {
    return html;
  }

  const scriptEls = assets.map((src) => {
    const scriptEl = document.createElement("script");
    scriptEl.src = `/${assetsPath.replace(/^\.{0,2}\/|\/$/g, "")}/${src}`;
    return scriptEl;
  });
  document.querySelector("body").append(...scriptEls);

  return dom.serialize();
}

async function insertComponentsScriptForPaths(
  pagePaths,
  bundledClientAssets,
  assetsPath
) {
  return Promise.all(
    pagePaths.map(async (pagePath) => {
      const absPagePath = path.resolve(process.cwd(), pagePath);
      const contents = await fs.readFile(absPagePath, "utf8");

      return fs.writeFile(
        absPagePath,
        insertComponentsScript(contents, bundledClientAssets, assetsPath)
      );
    })
  );
}

function removeHelmetDataAttribute(str) {
  return str.replace(/data-react-helmet="true"/g, "").replace(/ {2,}/g, " ");
}

async function generateHTML({ bodyContent, helmet }) {
  let html = dedent`
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

  return html;
}

module.exports = function eleventyPluginReact(
  eleventyConfig,
  { babelConfig, assetsPath = "/assets", postProcess = null } = {}
) {
  if (typeof babelConfig !== "function") {
    throw new Error("`babelConfig` is required and must be a function.");
  }

  for (const ext of ["js", "jsx"]) {
    eleventyConfig.addTemplateFormats(ext);
    eleventyConfig.addExtension(ext, {
      // The module is loaded in the compile method below.
      read: false,
      getData: true,
      getInstanceFromInputPath(inputPath) {
        return requireFromDir(inputPath, APP_ROOT).default;
      },
      compile(_str, inputPath) {
        return async (data) => {
          const componentExport = requireFromDir(inputPath, APP_ROOT).default;
          const mergedData = {
            filters: this.config.javascriptFunctions,
            ...data,
          };
          hydrationCache.setPage(inputPath);
          const Component = React.createElement(
            componentExport,
            mergedData,
            null
          );
          const bodyContent = ReactDOM.renderToString(Component);
          const helmet = Helmet.renderStatic();
          const html = await generateHTML({
            bodyContent,
            helmet,
          });

          if (typeof postProcess === "function") {
            return postProcess(html);
          }

          return html;
        };
      },
    });
  }

  let foundPagesLength = 0;
  let pagesToTransform = [];
  let bundledClientAssets = [];

  eleventyConfig.addCollection("allPages", (collectionApi) => {
    const allCollection = collectionApi.getAll();
    foundPagesLength = allCollection.length;
    return allCollection;
  });

  eleventyConfig.addTransform(
    "eleventy-plugin-react-insert-scripts",
    async function (content, outputPath) {
      if (outputPath.endsWith(".html")) {
        pagesToTransform.push(outputPath);
      }

      if (
        hydrationCache.hasComponents() &&
        pagesToTransform.length === foundPagesLength
      ) {
        const stats = await bundleClientAssets({
          babelConfig: babelConfig({ isBrowser: true }),
          outputPath: path.resolve(
            this.outputDir,
            assetsPath.replace(/^\//, "")
          ),
        });
        bundledClientAssets = Array.from(stats.compilation.assetsInfo.keys());
        // Don't include the final page since it hasn't been written to disk yet.
        pagesToTransform.pop();
        await insertComponentsScriptForPaths(
          pagesToTransform,
          bundledClientAssets,
          assetsPath
        );
        const transformedContent = insertComponentsScript(
          content,
          bundledClientAssets,
          assetsPath
        );
        // Reset state for long-lived processes
        foundPagesLength = 0;
        pagesToTransform = [];
        bundledClientAssets = [];

        return transformedContent;
      }

      return content;
    }
  );

  // TODO: When released, use beforeBuild and afterBuild to revert
  // this hook for long-lived processes.
  // https://www.11ty.dev/docs/events/
  setupBabelHook(babelConfig({ isBrowser: false }));
};
