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

  const resolvedPath = resolveFromDir(modulepath, dir);

  // This will remove the previously required template from the require cache
  // This is necessary to force components to refresh when runing eleventy --serve
  // Otherwise only the originally imported version of the template will be used
  // TODO: determine if this needs to depend on the mod parameter
  // TODO: only clear templates when starting a new build cycle
  // (requires keeping a list of imported templates to purge)
  delete require.cache[resolvedPath];

  return mod.require(resolvedPath);
}

module.exports = {
  resolveFromDir,
  requireFromDir,
};
