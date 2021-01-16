"use strict";

const path = require("path");
const babelHook = require("./babelHook");
const babelConfig = require("./babelConfig");
const hydrationCache = require("./hydrationCache");
const { bundleClientAssets } = require("./clientBundler");
const {
  generateDefaultHtml,
  insertComponentsScript,
  insertComponentsScriptForPaths,
} = require("./htmlMutator");
const { requireFromDir } = require("./moduleUtils");
const { APP_ROOT } = require("./constants");
const { normalizeExtension } = require("./stringUtils");
const { React, ReactDOM } = require("./peerDeps").modules;

module.exports = function eleventyPluginReact(
  eleventyConfig,
  {
    exts = ["js", "jsx", "ts", "tsx"],
    targets = "last 2 versions, safari >= 12",
    assetsPath = "/assets/",
    postProcess = null,
    babelConfig: userBabelConfigHook = null,
  } = {}
) {
  if (typeof targets !== "string") {
    throw new Error("`targets` must be a string.");
  }

  if (typeof assetsPath !== "string") {
    throw new Error("`assetsPath` must be a string.");
  }

  if (postProcess !== null && typeof postProcess !== "function") {
    throw new Error("`postProcess` must be a function.");
  }

  if (
    userBabelConfigHook !== null &&
    typeof userBabelConfigHook !== "function"
  ) {
    throw new Error("`babelConfig` must be a function.");
  }

  const ssrBabelConfig = babelConfig.generate({
    isClientBundle: false,
    targets,
    configHook: userBabelConfigHook,
  });
  const browserBabelConfig = babelConfig.generate({
    isClientBundle: true,
    targets,
    configHook: userBabelConfigHook,
  });

  for (const ext of exts.map((ext) => normalizeExtension(ext, false))) {
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
            functions: this.config.javascriptFunctions,
            ...data,
          };

          hydrationCache.setNewPage(inputPath);

          const Component = React.createElement(
            componentExport,
            mergedData,
            null
          );
          const html = ReactDOM.renderToString(Component);

          babelHook.flushCache();

          if (typeof postProcess === "function") {
            return postProcess({ html, data });
          }

          return generateDefaultHtml(html, data);
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
          babelConfig: browserBabelConfig,
          outputPath: path.resolve(
            this.outputDir,
            assetsPath.replace(/^\//, "")
          ),
          assetsPath,
        });
        bundledClientAssets = Array.from(
          stats.compilation.assetsInfo.keys()
        ).filter((asset) => /^(main|vendor)\./.test(asset));

        // Don't include the final page since it hasn't been written to disk yet.
        pagesToTransform.pop();
        await insertComponentsScriptForPaths(
          pagesToTransform,
          bundledClientAssets,
          assetsPath
        );

        // Now we can transform the final page through the normal 11ty transform flow.
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
  babelHook.setup(ssrBabelConfig, exts);
};
