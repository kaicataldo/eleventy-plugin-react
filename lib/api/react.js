"use strict";

const { PACKAGE_ROOT } = require("../utils").constants;

module.exports = require(require.resolve("react", { paths: [PACKAGE_ROOT] }));
