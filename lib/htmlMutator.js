"use strict";

const path = require("path");
const { promises: fs } = require("fs");
const { JSDOM } = require("jsdom");
const dedent = require("dedent");

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

module.exports = {
  generateDefaultHtml,
  insertComponentsScript,
  insertComponentsScriptForPaths,
};
