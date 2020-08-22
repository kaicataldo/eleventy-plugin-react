"use strict";

module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "script",
  },
  plugins: ["node"],
  extends: ["eslint:recommended", "plugin:node/recommended", "prettier"],
  rules: {
    strict: "error",
    "node/no-unpublished-require": "off",
  },
};
