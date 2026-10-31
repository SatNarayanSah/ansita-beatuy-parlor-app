module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo automatically adds the react-native-worklets plugin
    // (required by Reanimated 4) when the package is installed.
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ios.ts', '.android.ts', '.ts', '.ios.tsx', '.android.tsx', '.tsx', '.js', '.json'],
          alias: {
            '@': './src',
          },
        },
      ],
    ],
  };
};
