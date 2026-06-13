const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  new RegExp(path.resolve(__dirname, '../server') + '/.*'),
];

module.exports = config;