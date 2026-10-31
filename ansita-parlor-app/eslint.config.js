// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*'],
  },
  {
    settings: {
      // Resolve the `@/` alias (tsconfig paths) for the import plugin.
      'import/resolver': { typescript: { project: './tsconfig.json' } },
    },
  },
]);
