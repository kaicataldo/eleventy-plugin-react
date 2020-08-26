# eleventy-plugin-react

A plugin that allows you to use React as a templating language for Eleventy. This is currently experimental, and relies on unstable Eleventy APIs.

## Usage

```js
// .eleventy.js

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyReact);
};
```

```sh
# Requires ELEVENTY_EXPERIMENTAL flag to run

ELEVENTY_EXPERIMENTAL=true npx @11ty/eleventy
```

## TODO

- [X] Partial hydration of interactive components to minimize bloat. Shouldn't have to think of this beyond having to mark which components should be interactive.
  - Idea: Higher order component to wrap interactive components in and mark them for hydration
- [ ] Add ability for user to use their own version of `React`/`ReactDOM` and Babel configuration
- [ ] Integration of CSS-in-JS
  - Styles should be extracted and rendered into head
  - Should a user be able to choose their implementation, or will a set API work? Leaning towards set API, maybe wrapping [emotion-server](https://emotion.sh/docs/ssr)
