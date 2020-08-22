"use strict";

const React = require("react");
const { isBrowser } = require("../utils");

let cache = null;
if (!isBrowser()) {
  cache = require("./hydrationCache");
}

module.exports = function withHydration(WrappedComponent) {
  return function HydratedComponent(props) {
    const children = [React.createElement(WrappedComponent, props)];

    if (!isBrowser()) {
      const id = cache.set(WrappedComponent, props);
      children.unshift(
        React.createElement("div", {
          style: { display: "none" },
          "data-hydration-id": id,
        })
      );
    }

    return React.createElement(React.Fragment, null, ...children);
  };
};
