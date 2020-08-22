"use strict";

exports.isBrowser = function isBrowser() {
  return typeof window !== "undefined";
};

exports.constants = require("./constants");
