"use strict";

module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "script",
  },
  env: {
    node: true,
  },
  plugins: ["node"],
  extends: ["eslint:recommended", "prettier"],
  rules: {
    strict: "error",
    "node/no-unpublished-require": "off",
  },
  overrides: [
    {
      files: ["!assets/**/*"],
      extends: ["plugin:node/recommended"],
    },
    // Isomorphic modules
    {
      files: ["lib/**/*.js", "utils.js"],
      env: {
        browser: true,
        node: true,
      },
    },
    // Client-side assets
    {
      files: ["assets/**/*"],
      parserOptions: {
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      extends: ["plugin:react/recommended"],
      env: {
        browser: true,
        node: false,
      },
    },
  ],
};
