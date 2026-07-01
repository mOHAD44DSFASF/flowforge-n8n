import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "tmp/**",
      "examples/**",
      "custom-nodes/**",
      "custom-node-demo/**"
    ]
  },
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser
    },
    rules: {
      "no-unused-vars": "off"
    }
  }
);
