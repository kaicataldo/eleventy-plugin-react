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

  set(Component, modulePath) {
    if (!modulePath) {
      throw new Error(
        `Could not calculate module path for hydrated component ${getComponentName(
          Component
        )}. Please ensure that the hydrated component is the default export in the module in which it is defined.`
      );
    }

    let componentName;
    if (this._components.has(modulePath)) {
      componentName = this._components.get(modulePath);
    } else {
      componentName = getComponentName(Component);
      this._components.set(modulePath, componentName);
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

  hasComponents() {
    return this._components.size;
  }

  flush() {
    this._currentId = 0;
    this._components.clear();
  }
}

module.exports = new HydrationCache();
