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

function isScriptTag(el) {
  return el.nodeName.toLowerCase() === "script";
}

function convertMarkers(html) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const startMarkerEls = document.querySelectorAll("[data-hydration-start-id]");

  // This page doesn't have any markers.
  if (!startMarkerEls.length) {
    return html;
  }

  for (const el of startMarkerEls) {
    // This shouldn't happen. Just being extra safe.
    if (!isScriptTag(el)) {
      continue;
    }

    const newMarkerEl = el.nextElementSibling;

    // Guard against misuse of the withHydration higher order component (using it
    // to wrap a component that doens't generate any DOM)
    if (
      isScriptTag(newMarkerEl) &&
      newMarkerEl.getAttribute("[data-hydration-end-id]")
    ) {
      throw new Error(
        `Attempting to hydrate component ${newMarkerEl.getAttribute(
          "[data-hydration-component-name]"
        )} on the client despite it not generating any DOM when rendered on the server.`
      );
    }

    const id = el.getAttribute("data-hydration-start-id");
    const componentName = el.getAttribute("data-hydration-component-name");
    const props = el.getAttribute("data-hydration-props");
    newMarkerEl.setAttribute("data-hydration-start-id", id);
    newMarkerEl.setAttribute("data-hydration-component-name", componentName);
    newMarkerEl.setAttribute("data-hydration-props", props);
    el.remove();
  }

  const endMarkerEls = document.querySelectorAll("[data-hydration-end-id]");

  for (const el of endMarkerEls) {
    // This shouldn't happen. Just being extra safe.
    if (!isScriptTag(el)) {
      continue;
    }

    const newMarkerEl = el.previousElementSibling;
    const id = el.getAttribute("data-hydration-end-id");
    newMarkerEl.setAttribute("data-hydration-end-id", id);
    el.remove();
  }

  return dom.serialize();
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
  convertMarkers,
  insertComponentsScript,
  insertComponentsScriptForPaths,
};
