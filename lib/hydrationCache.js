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
    this._components = new Map();
    this._currentId = 0;
  }

  set(Component) {
    // __modulePath is only set on default exports
    if (!Component.__modulePath) {
      throw new Error(
        "Hydrated components must be the default export of a module."
      );
    }

    let componentName;
    if (this._components.has(Component.__modulePath)) {
      componentName = this._components.get(Component.__modulePath);
    } else {
      componentName = getComponentName(Component);
      this._components.set(Component.__modulePath, componentName);
    }

    return {
      id: this._currentId++,
      componentName,
    };
  }

  getComponents() {
    return Array.from(
      this._components.entries()
    ).map(([modulePath, componentName]) => ({ modulePath, componentName }));
  }

  flush() {
    this._currentId = 0;
    this._components.clear();
  }
}

module.exports = new HydrationCache();
