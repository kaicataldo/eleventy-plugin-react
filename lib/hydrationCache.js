"use strict";

function getComponentName(Component) {
  const name = Component.displayName || Component.name;
  if (!name) {
    throw new Error("Hydrated components must be named.");
  }
  return name;
}

class HydrationCache {
  constructor() {
    this._components = {};
  }

  set(Component, props) {
    // __modulePath is only set on default exports
    if (!Component.__modulePath) {
      throw new Error(
        "Hydrated components must be the default export of a module."
      );
    }

    const id = Object.keys(this._components).length;
    this._components[id] = {
      modulePath: Component.__modulePath,
      name: getComponentName(Component),
      props,
    };
    return id;
  }

  getComponents() {
    return { ...this._components };
  }

  flush() {
    for (const key in Object.keys(this._components)) {
      delete this._components[key];
    }
  }
}

const cache = new HydrationCache();
Object.freeze(cache);

module.exports = cache;
