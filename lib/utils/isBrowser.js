"use strict";

module.exports = function isBrowser() {
  return typeof window !== "undefined";
};
