"use strict";

module.exports = {
  plugins: ["node"],
  extends: ["eslint:recommended", "plugin:node/recommended", "prettier"],
  rules: {
    strict: "error",
  },
};
