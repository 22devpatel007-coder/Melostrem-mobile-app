module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@hooks': './src/hooks',
            '@services': './src/services',
            '@store': './src/store',
            '@utils': './src/utils',
            '@constants': './src/constants',
            '@navigation': './src/navigation',
            '@player': './src/player',
            '@config': './src/config',
            '@providers': './src/providers',
            '@types': './src/types',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};