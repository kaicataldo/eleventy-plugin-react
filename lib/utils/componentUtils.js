"use strict";

function getComponentName(Component) {
  const name = Component.displayName || Component.name;
  if (!name) {
    throw new Error("Hydrated components must be named.");
  }
  return name;
}

module.exports = {
  getComponentName,
};
