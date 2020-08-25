"use strict";

const React = require("react");
const isBrowser = require("./utils/isBrowser");

module.exports = function withHydration(WrappedComponent) {
  return function HydratedComponent(props) {
    const componentInstance = React.createElement(WrappedComponent, props);
    const children = [componentInstance];

    if (!isBrowser()) {
      const cache = require("./hydrationCache");
      const { id, componentName } = cache.set(
        WrappedComponent,
        // This value is set by the require hook during rendering.
        // If the Component is the default export, it will be defined on the
        // Component itself. If the wrapped component is the default export,
        // it will be on the wrapper.
        WrappedComponent.__modulePath || HydratedComponent.__modulePath
      );
      children.unshift(
        React.createElement("script", {
          type: "text/javascript",
          "data-hydration-start-id": id,
          dangerouslySetInnerHTML: {
            __html: `${
              id === 0 ? "window.__hydrationData = {};\n" : ""
            }window.__hydrationData["${id}"] = { props: ${JSON.stringify(
              props
            )}, componentName: "${componentName}" };`,
          },
        })
      );
      children.push(
        React.createElement("div", {
          "data-hydration-end-id": id,
          style: { display: "none" },
        })
      );
    }

    return React.createElement(React.Fragment, null, ...children);
  };
};
