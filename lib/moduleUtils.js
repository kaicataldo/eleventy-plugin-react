"use strict";

function resolveFromDir(modulePath, dir) {
  return require.resolve(modulePath, { paths: [dir] });
}

function requireFromDir(modulepath, dir) {
  if (typeof window !== "undefined") {
    throw new Error(
      "This should only be used in server-side code, as Webpack will not be able to bundle any modules required."
    );
  }

  return require(resolveFromDir(modulepath, dir));
}

module.exports = {
  resolveFromDir,
  requireFromDir,
};
