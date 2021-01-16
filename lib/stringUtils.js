"use strict";

function normalizeExtension(ext, shouldHaveDot) {
  const trimmedExt = ext.trim();

  if (shouldHaveDot) {
    if (!trimmedExt.startsWith(".")) {
      return `.${trimmedExt}`;
    }

    return trimmedExt;
  }

  if (trimmedExt.startsWith(".")) {
    return trimmedExt.replace(/^\./u, "");
  }

  return trimmedExt;
}

module.exports = {
  normalizeExtension,
};
