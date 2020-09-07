# eleventy-plugin-react

[![npm](https://img.shields.io/npm/v/eleventy-plugin-react.svg?style=flat-square)](https://www.npmjs.com/package/eleventy-plugin-react/)
[![node](https://img.shields.io/node/v/eleventy-plugin-react.svg?style=flat-square)](https://nodejs.org/en/)

A plugin that allows you to use React as a templating language for Eleventy. This is currently experimental, and relies on unstable Eleventy APIs.

## Installation

This plugin requires `react` and `react-dom` as peer dependencies to allow you to have control over which version of React you're using.

```sh
npm install eleventy-plugin-react react react-dom
```

or

```sh
yarn add eleventy-plugin-react react react-dom
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

Data for each page is passed as props to the entrypoint page component. You can learn more about using data in Eleventy [here](https://www.11ty.dev/docs/data/).

## Interactive components

The plugin includes a `withHydration` higher order component utility that marks a component for hydration, bundles the component, and inserts a script into the `body` of the rendered HTML that hyrates the component in the client.

Some important notes about `withHydration`:

- The component to be hydrated must either be the default export of a file or wrapped in the `withHydration` higher order component and exported. Examples below!
- The plugin keeps track of the hydrated components (which is why marking components for hydration is limited to default exports) and only bundles those components. I'd love to find a way around this limitation, if anyone has any ideas.
- The hydration JavaScript bundle is only created when there are components marked for hydration and it is automatically generated and appended to the `body` of the server-side rendered markup for each page.

```js
import React from "react";

export default function PageLayout(props) {
  return (
    <body>
      <div>{props.children}</div>
    </body>
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
  const MaybeHydratedComponent2 =
    props.page.url === "/" ? withHydration(Counter2) : Counter2;

  return (
    <PageLayout>
      {/* Counter is wrapped and then exported */}
      <Counter initialCount={2} />
      {/* Counter2 is exported and then wrapped */}
      <MaybeHydratedComponent2 />
    </PageLayout>
  );
}
```

```sh
# Requires ELEVENTY_EXPERIMENTAL flag to run

ELEVENTY_EXPERIMENTAL=true npx @11ty/eleventy
```

You can now run Eleventy to build your site!

**Note**: Since this plugin currently relies on experimental Eleventy APIs, running the build requires using the `ELEVENTY_EXPERIMENTAL=true` CLI flag.

This was started as a proof of concept, and I would love to improve this package. Things that I think would be beneficial to explore:

- Being able to provide your own Babel config/versions.
- Extraction and inclusion of styles when using CSS-in-JS libraries.
