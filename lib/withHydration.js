"use strict";

const React = require("react");
const isBrowser = require("./utils/isBrowser");

module.exports = function withHydration(WrappedComponent) {
  return function HydratedComponent(props) {
    const children = [React.createElement(WrappedComponent, props)];

    if (!isBrowser()) {
      const cache = require("./hydrationCache");
      const { id, componentName } = cache.set(WrappedComponent);
      children.unshift(
        React.createElement("script", {
          type: "text/javascript",
          "data-hydration-id": id,
          dangerouslySetInnerHTML: {
            __html: `${
              id === 0 ? "window.__hydrationData = {};\n" : ""
            }window.__hydrationData["${id}"] = { props: ${JSON.stringify(
              props
            )}, componentName: "${componentName}" };`,
          },
        })
      );
    }

    return React.createElement(React.Fragment, null, ...children);
  };
};
