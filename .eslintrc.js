"use strict";

module.exports = {
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "script",
  },
  env: {
    es2021: true,
    node: true,
  },
  plugins: ["node"],
  extends: ["eslint:recommended", "prettier"],
  rules: {
    strict: "error",
    "node/no-unpublished-require": "off",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  overrides: [
    {
      files: ["!assets/**/*"],
      extends: ["plugin:node/recommended"],
      rules: {
        "node/no-unpublished-require": "off",
      },
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
