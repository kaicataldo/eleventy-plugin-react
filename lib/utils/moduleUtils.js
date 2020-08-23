"use strict";

function resolveModuleFromCWD(moduleToResolve) {
  return require.resolve(moduleToResolve, { paths: [process.cwd()] });
}

function loadModuleFromCWD(modulePath) {
  // TODO: Babel doesn't transform the `require` statements. Figure out module interop when using CommonJS in source code.
  // loadedModule.__esModule === true ? loadedModule.default : loadedModule;
  return require(resolveModuleFromCWD(modulePath));
}

module.exports = {
  resolveModuleFromCWD,
  loadModuleFromCWD,
};
