# eleventy-plugin-react

[![npm](https://img.shields.io/npm/v/eleventy-plugin-react.svg?style=flat-square)](https://www.npmjs.com/package/eleventy-plugin-react/)
[![node](https://img.shields.io/node/v/eleventy-plugin-react.svg?style=flat-square)](https://nodejs.org/en/)

A plugin that allows you to use React as a templating language for Eleventy. This is currently experimental, and relies on unstable Eleventy APIs.

## Installation

This plugin requires `react`, `react-dom`, `react-helmet`, `@babel/core`, and `babel-loader` as peer dependencies to allow you to have control over which version of these packages you're using.

```sh
npm install eleventy-plugin-react react react-dom react-helmet @babel/core babel-loader
```

or

```sh
yarn add eleventy-plugin-react react react-dom react-helmet @babel/core babel-loader
```

## Usage

First, add the plugin to your config. The plugin will automatically compile any files given to it with a `.js` or `.jsx` extension using Babel and server-side render the page.

```js
// .eleventy.js

const eleventyReact = require("eleventy-plugin-react");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyReact, {
    babelConfig({ isClientBundle }) {
      return {
        presets: [
          "@babel/preset-react",
          [
            "@babel/preset-env",
            isClientBundle
              ? {
                  modules: false,
                  targets: "> 0.25%, not dead",
                }
              : {
                  modules: "commonjs",
                  targets: {
                    node: process.versions.node,
                  },
                },
          ],
        ],
      };
    },
  });

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

All the content will be rendered into the `body`. React Helmet can be used to alter the `head`.

Data for each page is passed as props to the entrypoint page component. You can learn more about using data in Eleventy [here](https://www.11ty.dev/docs/data/).

You can now run Eleventy to build your site!

```sh
# Requires ELEVENTY_EXPERIMENTAL flag to run

ELEVENTY_EXPERIMENTAL=true npx @11ty/eleventy
```

**Note**: Since this plugin currently relies on experimental Eleventy APIs, running the build requires using the `ELEVENTY_EXPERIMENTAL=true` CLI flag.

## Options

### `babelConfig`

```ts
{
  babelConfig: (context: { clientBundle: boolean }) => Object;
}
```

`babelConfig` is a function that returns a Babel configuration object to be used both for compiling during server-side rendering the the static markup as well as when bundling the hydrated components for the browser. This takes the place of using a standard Babel configuration file, and the available options can be found [here](https://babeljs.io/docs/en/options).

The function is called with a `context` object that has the following signature:

```ts
{
  // When `true`, the configuration is being used to build the client bundle.
  // When `false`, it is being used to compile the code for server-side rendering.
  isClientBundle: boolean;
}
```

There are a few gotchas when configuring Babel for server-side rendering as well as for the client:

1. Compile to CommonJS when executing in a project that is not using ES Modules.
1. `targets` should be set so that the code can be executed in the version of Node.js you're using. If this doesn't match the syntax supported in the target browsers, you can use the `isClientBundle` property in the context object to configure it for both environments.

```js
function babelConfig({ isClientBundle }) {
  return {
    presets: [
      "@babel/preset-react",
      [
        "@babel/preset-env",
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
  postProcess?: (html: string) => string | async (html: string) => string;
}
```

`postProcess` is a function (both synchronous and asynchronous functions are supported) that is called after server-side rendering has completed. This hook serves as a way to transform the rendered output before it is written to disk (extracting critical styles and inserting them into the head, for instance). The string (or `Promise` resolving to a string) that is returned will be written to disk.

### Example usage

```js
eleventyConfig.addPlugin(eleventyReact, {
  babelConfig({ isClientBundle }) {
    return {
      presets: [
        "@babel/preset-react",
        [
          "@babel/preset-env",
          isClientBundle
            ? {
                modules: false,
                targets: "> 0.25%, not dead",
              }
            : {
                modules: "commonjs",
                targets: {
                  node: process.versions.node,
                },
              },
        ],
      ],
    };
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
