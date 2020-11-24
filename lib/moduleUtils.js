"use strict";

function resolveFromDir(modulePath, dir) {
  return require.resolve(modulePath, { paths: [dir] });
}

// This is a hack that allows us to use dynamic expressions in files that are processed by
// Webpack (in this case, to import a peerDep for SSR since we don't know its exact location).
// Webpack will ignore this require because it can't be sure it's the correct require.
function requireFromDir(modulepath, dir, mod = module) {
  if (typeof window !== "undefined") {
    throw new Error(
      "This should only be used in server-side code, as Webpack will not be able to bundle any modules required."
    );
  }

  return mod.require(resolveFromDir(modulepath, dir));
}

module.exports = {
  resolveFromDir,
  requireFromDir,
};
