const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [],
  watcher: {
    usePolling: false,
    ignored: [
      /node_modules\/.*\/.*/,
      /ios\/build\/.*/,
      /android\/build\/.*/,
      /\.git\/.*/,
      /\.DS_Store/,
      /Thumbs\.db/,
    ],
  },
  resetCache: true,
};

module.exports = mergeConfig(defaultConfig, config);