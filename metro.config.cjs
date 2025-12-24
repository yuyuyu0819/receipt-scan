const { getDefaultConfig } = require('expo/metro-config');
const { withExpoRouter } = require('expo-router/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  ...(config.resolver.alias ?? {}),
  '@': path.resolve(__dirname),
};

module.exports = withExpoRouter(config);
