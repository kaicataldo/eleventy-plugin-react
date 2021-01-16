# eleventy-plugin-react

[![npm](https://img.shields.io/npm/v/eleventy-plugin-react.svg?style=flat-square)](https://www.npmjs.com/package/eleventy-plugin-react/)
[![node](https://img.shields.io/node/v/eleventy-plugin-react.svg?style=flat-square)](https://nodejs.org/en/)

A plugin that allows you to use React as a templating language for Eleventy. This is currently experimental, and relies on unstable Eleventy APIs.

## Installation

```sh
npm install eleventy-plugin-react @babel/core @babel/preset-env @babel/preset-react @babel/preset-typescript react react-dom core-js@3 regenerator-runtime
```

or

```sh
yarn add eleventy-plugin-react @babel/core @babel/preset-env @babel/preset-react @babel/preset-typescript react react-dom core-js@3 regenerator-runtime
```

## Usage

First, add the plugin to your config. The plugin will automatically compile any files given to it with a `.js` or `.jsx` extension using Babel and server-side render the page.

```js
// .eleventy.js

const eleventyReact = require("eleventy-plugin-react");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyReact);

  return {
    dir: {
      input: "src/pages",
    },
  };
};
```

```js
// src/pages/index.js OR src/pages/index.jsx

import React from "react";
import ParentLayout from "../layouts/ParentLayout";
import ChildComponent from "../components/ChildComponent";

// `props` is the data provided by Eleventy.
export default function IndexPage(props) {
  return (
    <ParentLayout>
      <h1>Welcome!</h1>
      <ChildComponent url={props.page.url} />
    </ParentLayout>
  );
}
```

All the content will be rendered into the `body`. Using the `postProcess` hook with React Helmet can be used to alter the `head` (see [here](#postprocess-optional)).

Data for each page is passed as props to the entrypoint page component. You can learn more about using data in Eleventy [here](https://www.11ty.dev/docs/data/).

You can now run Eleventy to build your site!

```sh
# Requires ELEVENTY_EXPERIMENTAL flag to run

ELEVENTY_EXPERIMENTAL=true npx @11ty/eleventy
```

**Note**: Since this plugin currently relies on experimental Eleventy APIs, running the build requires using the `ELEVENTY_EXPERIMENTAL=true` CLI flag.

## Options

### `targets` (optional)

```ts
{
  targets?: string;
}
```

`targets` is what used to specify browser targets for the component hydration bundle for the client. Under the hood, it's passed to `@babel/preset-env`. Defaults to `"last 2 versions, safari >= 12"`. Please note that you do not need to specify this if you are creating your own custom Babel configuration using the `babelConfig` option, as long as you set your own targets.

### `exts` (optional)

```ts
{
  exts?: string[];
}
```

`exts` allows you to define what extensions you would like Eleventy to include when running this plugin. Defaults to `["js", "jsx", "ts", "tsx"]`.

### `babelConfig` (optional)

```ts
{
  babelConfig: ({ config: BabelConfig; isClientBundle: boolean }) =>
    BabelConfig;
}
```

This option is only required if you would like to customize your Babel configuration. `babelConfig` is a function that returns a Babel configuration object to be used both for compiling during server-side rendering the the static markup as well as when bundling the hydrated components for the browser. This takes the place of using a standard Babel configuration file, and the available options can be found [here](https://babeljs.io/docs/en/options).

The function is called with an object that has the following signature:

```ts
{
  // The default Babel config.
  config: BabelConfig;
  // When `true`, the configuration is being used to build the client bundle.
  // When `false`, it is being used to compile the code for server-side rendering.
  isClientBundle: boolean;
}
```

There are a few gotchas when configuring Babel for server-side rendering as well as for the client:

1. Compile to CommonJS when executing in a project that is not using ES Modules.
1. `targets` should be set so that the code can be executed in the version of Node.js you're using. If this doesn't match the syntax supported in the target browsers, you can use the `isClientBundle` property in the context object to configure it for both environments.

```js
const presetEnv = require("@babel/preset-env");
const presetReact = require("@babel/preset-react");

function babelConfig({ config, isClientBundle }) {
  return {
    presets: [
      [
        presetEnv,
        {
          // Must be "commonjs" when not using ES Modules in Node.js.
          modules: isClientBundle ? false : "commonjs",
          targets: isClientBundle
            ? "> 0.25%, not dead"
            : {
                // Ensure that the server-side rendered components can be executed
                // in the current version of Node.js.
                node: process.versions.node,
              },
        },
      ],
      presetReact,
    ],
  };
}
```

### `assetsPath` (optional)

```ts
{
  assetsPath?: string;
}
```

`assetsPath` is the path for the outputted bundle of hydrated client-side assets, relative to Eleventy's configured output directory. Defaults to `"/assets/"`. By default, this means that the client-side bundles would be outputted to `_site/assets/`.

### `postProcess` (optional)

```ts
{
  postProcess?: ({ html: string, data: EleventyData }) => string | async ({ html: string, data: EleventyData }) => string;
}
```

`postProcess` is a function (both synchronous and asynchronous functions are supported) that is called after server-side rendering has completed. This hook serves as a way to transform the rendered output before it is written to disk (extracting critical styles and inserting them into the head, for instance). The string (or `Promise` resolving to a string) that is returned will be written to disk.

The function is called with an object that has the following signature:

```ts
{
  // The rendered HTML for the page.
  html: string;
  // The data provided to the page by Eleventy.
  data: EleventyData;
}
```

If `postProcess` is not defined, the following default HTML will be generated:

```js
function defaultPostProcess(html, data) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${data.page.title || data.site.title}</title>
        <meta name="description" content=${
          data.page.description || data.site.description
        } />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
      </head>
      <body>
        <div id="content">${html}</div>
      </body>
    </html>
  `;
}
```

To integrate `react-helmet`, you can use the following `postProcess` function in your .eleventy.js configuration:

```js
const { Helmet } = require("react-helmet");

function postProcess(html, data) {
  const helmet = Helmet.renderStatic();

  return `
    <!doctype html>
    <html ${removeHelmetDataAttribute(helmet.htmlAttributes.toString())}>
      <head>
        ${removeHelmetDataAttribute(helmet.title.toString())}
        ${removeHelmetDataAttribute(helmet.meta.toString())}
        ${removeHelmetDataAttribute(helmet.link.toString())}
      </head>
      <body ${removeHelmetDataAttribute(helmet.bodyAttributes.toString())}>
        <div id="content">
          ${html}
        </div>
      </body>
    </html>
  `;
}
```

### Example usage

```js
const myBabelPlugin = require("my-babel-plugin");

eleventyConfig.addPlugin(eleventyReact, {
  babelConfig({ config, isClientBundle }) {
    if (isClientBundle) {
      config.plugins.push(myBabelPlugin);
    }

    return config;
  },
  assetsPath: "/assets/js",
  async postProcess(html) {
    try {
      // Try to extract and inline critical styles into head.
      const transformedHtml = await extractAndInsertCritialStyles(html);
      return transformedHtml;
    } catch (e) {
      // Fall back to original html if unsuccessful.
      console.error("Extraction of critical styles failed.");
      return html;
    }
  },
});
```

## Interactive components

The plugin includes a `withHydration` higher order component utility that marks a component for hydration, bundles the component, and inserts a script into the `body` of the rendered HTML that hydrates the component in the client.

Some important notes about `withHydration`:

- The component to be hydrated must either be the default export of a file or wrapped in the `withHydration` higher order component and exported. Examples below!
- The plugin keeps track of the hydrated components (which is why marking components for hydration is limited to default exports) and only bundles those components. I'd love to find a way around this limitation, if anyone has any ideas.
- The hydration JavaScript bundle is only created when there are components marked for hydration and it is automatically generated and appended to the `body` of the server-side rendered markup for each page.

```js
import React from "react";
import { Helmet } from "react-helmet";

export default function PageLayout(props) {
  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <title>My Title</title>
        <link rel="canonical" href="http://mysite.com/example" />
      </Helmet>
      <div class="container">{props.children}</div>
    </>
  );
}
```

```js
import React, { useState } from "react";
import { withHydration } from "eleventy-plugin-react/utils";

function Counter({ initialCount }) {
  const [count, setCount] = useState(initialCount);
  return (
    <>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>Click me, please!</button>
    </>
  );
}

// The component can be wrapped in the withHydration higher order component and exported.
// Note that it must be the default export.
export default withHydration(Counter);
```

```js
import React, { useState } from "react";

function Counter2({ initialCount }) {
  const [count, setCount] = useState(initialCount);
  return (
    <>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>Click me, please!</button>
    </>
  );
}

// The component can be exported and then wrapped in the withHydration higher order component in
// the parent component. Note that it must be the default export.
export default Counter2;
```

```js
import React from "react";
import { withHydration } from "eleventy-plugin-react/utils";
import PageLayout from "../layouts/Page";
import Counter from "../components/Counter";
import Counter2 from "../components/Counter2";

// `props` is the data provided by Eleventy.
export default function IndexPage(props) {
  // Only hydrate the Counter2 component on the home page.
  // Counter2 is the default export in the module it's defined in,
  // so we can hydrate it conditionally in the component that imports it.
  const MaybeHydratedCounter2 =
    props.page.url === "/" ? withHydration(Counter2) : Counter2;

  return (
    <PageLayout>
      {/* Counter is wrapped and then exported */}
      <Counter initialCount={2} />
      {/* Counter2 is exported and then wrapped */}
      <MaybeHydratedCounter2 />
    </PageLayout>
  );
}
```

## Further improvements

This was started as a proof of concept, and I would love to improve this package. Things that I think would be beneficial to explore:

- Tests
- Expose ability to modify underlying Webpack and Babel configs to allow for TypeScript, SCSS, etc.
- Improve dev UX by using Babel/Webpack cache
