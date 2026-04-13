const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

const strictTypeScriptRules = {
  ...tsPlugin.configs.recommended.rules,
  "@typescript-eslint/await-thenable": "error",
  "@typescript-eslint/consistent-type-imports": [
    "error",
    { prefer: "type-imports", disallowTypeAnnotations: false }
  ],
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
  "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  "curly": "error",
  "eqeqeq": ["error", "always"],
  "no-var": "error",
  "prefer-const": "error"
};

module.exports = [
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "jest.config.ts"]
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: strictTypeScriptRules
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tests/tsconfig.json",
        tsconfigRootDir: __dirname,
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...strictTypeScriptRules,
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];
