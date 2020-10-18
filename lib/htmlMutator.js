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

function removeHelmetDataAttribute(str) {
  return str.replace(/data-react-helmet="true"/g, "").replace(/ {2,}/g, " ");
}

async function generateHtml({ bodyContent, helmet }) {
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

module.exports = {
  generateHtml,
  insertComponentsScript,
  insertComponentsScriptForPaths,
};
