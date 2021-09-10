"use strict";

const path = require("path");
const { promises: fs } = require("fs");
const { JSDOM } = require("jsdom");
const dedent = require("dedent");

function generateDefaultHtml(bodyContent, { page = {}, site = {} } = {}) {
  return dedent`
    <!doctype html>
    <html>
      <head>
        <title>${page.title || site.title}</title>
        <meta name="description" content=${
          page.description || site.description
        }>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      </head>
      <body>
        <div id="content">
          ${bodyContent}
        </div>
      </body>
    </html>
  `;
}

function transformHydrationMarkers(html) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const startScriptMarkers =
    document.querySelectorAll("[data-hydration-start-id]") || [];
  const endScriptMarkers =
    document.querySelectorAll("[data-hydration-end-id]") || [];

  // This page doesn't have any components to hydrate.
  if (!startScriptMarkers.length) {
    return html;
  }

  for (const el of startScriptMarkers) {
    const id = el.getAttribute("data-hydration-start-id");
    const componentName = el.getAttribute("data-hydration-component-name");
    const props = el.getAttribute("data-hydration-props");
    const data = {
      id,
      loc: "start",
      componentName,
      props,
    };

    const commentNode = document.createComment(
      `__ELEVENTY_REACT_HYDRATION_MARKER__: ${JSON.stringify(data)}`
    );
    el.replaceWith(commentNode);
  }

  for (const el of endScriptMarkers) {
    const id = el.getAttribute("data-hydration-end-id");
    const data = { id, loc: "end" };
    const commentNode = document.createComment(
      `__ELEVENTY_REACT_HYDRATION_MARKER__:${JSON.stringify(data)}`
    );
    el.replaceWith(commentNode);
  }

  return dom.serialize();
}

function insertComponentsScript(html, assets, assetsPath) {
  const dom = new JSDOM(html);
  const { document } = dom.window;

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

module.exports = {
  generateDefaultHtml,
  transformHydrationMarkers,
  insertComponentsScript,
  insertComponentsScriptForPaths,
};
