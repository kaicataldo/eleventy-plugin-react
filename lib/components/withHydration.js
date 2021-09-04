"use strict";

const { requireFromDir } = require("../moduleUtils");
const { APP_ROOT } = require("../constants");

// Use the top-level, peerDependency React. This is aliased when
// bundling for the client.
const React =
  typeof window === "undefined"
    ? requireFromDir("react", APP_ROOT)
    : // eslint-disable-next-line node/no-missing-require
      require("react");

module.exports = function withHydration(WrappedComponent) {
  return function HydratedComponent(props) {
    const children = [React.createElement(WrappedComponent, props)];

    // Create placeholders when server-side rendering.
    if (typeof window === "undefined") {
      let cache;

      try {
        // In case we're in a non-Node environment (Cloudflare worker, etc.)
        cache = require("../hydrationCache");
      } catch (e) {
        console.error("This environment is not currently supported.");
        throw e;
      }

      const { id, componentName } = cache.setComponent(
        WrappedComponent,
        // This value is set by the require hook during rendering.
        // If the Component is the default export, it will be defined on the
        // Component itself. If the wrapped component is the default export,
        // it will be on the wrapper.
        WrappedComponent.__modulePath || HydratedComponent.__modulePath
      );
      children.unshift(
        React.createElement("script", {
          "data-hydration-start-id": id,
          "data-hydration-component-name": componentName,
          "data-hydration-props": `{ "props": ${JSON.stringify(
            props
          )}, "componentName": "${componentName}" }`,
        })
      );
      children.push(
        React.createElement("script", {
          "data-hydration-end-id": id,
        })
      );
    }

    return React.createElement(React.Fragment, null, ...children);
  };
};
