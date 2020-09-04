# eleventy-plugin-react

A plugin that allows you to use React as a templating language for Eleventy. This is currently experimental, and relies on unstable Eleventy APIs.

## Installation

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

```sh
# Requires ELEVENTY_EXPERIMENTAL flag to run

ELEVENTY_EXPERIMENTAL=true npx @11ty/eleventy
```

You can now run Eleventy to build your site!

**Note**: Since this plugin currently relies on experimental Eleventy APIs, running the build requires using the `ELEVENTY_EXPERIMENTAL=true` CLI flag.

This was started as a proof of concept, and I would love to improve this package. Things that I think would be beneficial to explore:

- Being able to write interactive components and hydrate them on the client-side. This should not include the static components in the bundle, though, because that's a lot of unnecessary bloat. You can see my work so far on [this branch](https://github.com/kaicataldo/eleventy-plugin-react/tree/withHydration). The current iteration has some limitations (the default export must either be the Component that is going to be hydrated or the higher order component using `withHydration` so that we know which files to include), and I've love to find a less brittle solution.
- Extraction and inclusion of styles when using CSS-in-JS libraries.
