const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
//const config = {};
const path = require('path');

//const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

//const defaultConfig = getDefaultConfig(__dirname);

const {
  resolver: { sourceExts, assetExts },
} = getDefaultConfig(__dirname);

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      ecma: 8,
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
    },
    // Disable Hermes to avoid dSYM issues
    hermesCommand: false,
  },
  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    extraNodeModules: {
      src: path.resolve(__dirname, 'src')
    },
  },
  watchFolders: [
    path.resolve(__dirname, 'src')
  ],
  resetCache: false,
  maxWorkers: 4,
  cacheStores: [
    {
      get: () => Promise.resolve(null),
      set: () => Promise.resolve(),
      clear: () => Promise.resolve(),
    },
  ],
};

//module.exports = mergeConfig(defaultConfig, config);
module.exports = mergeConfig(getDefaultConfig(__dirname), config);
