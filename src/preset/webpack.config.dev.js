import { join } from 'path';
import webpack from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import SystemBellWebpackPlugin from 'system-bell-webpack-plugin';
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin';
import WatchMissingNodeModulesPlugin from 'react-dev-utils/WatchMissingNodeModulesPlugin';
import { dllBundleFileName } from '../utils/fileNames';
import getEntry from './getEntry';
import getTheme from './getTheme';
import getCSSLoaders from './getCSSLoaders';
import {
  node,
  getBabelOptions,
  baseSvgLoader,
  spriteSvgLoader,
  defaultDevtool,
  getResolve,
  getFirstRules,
  getCSSRules,
  getLastRules,
  getCommonPlugins,
  addExtraBabelIncludes,
} from './common';

export default function (config, paths) {
  const publicPath = '/';
  const {
    library = null,
    libraryTarget = 'var',
    devtool = defaultDevtool,
  } = config;

  const theme = getTheme(process.cwd(), config);
  const cssLoaders = getCSSLoaders(config);
  const babelOptions = getBabelOptions(config);

  const output = {
    path: paths.appBuild,
    filename: '[name].js',
    chunkFilename: '[name].async.js',
    publicPath,
    libraryTarget,
  };

  if (library) {
    output.library = library;
  }

  const dllPlugins = config.dllPlugin ? [
    new webpack.DllReferencePlugin({
      context: paths.appSrc,
      manifest: require(paths.dllManifest),  // eslint-disable-line
    }),
    new CopyWebpackPlugin([
      {
        from: join(paths.dllNodeModule, dllBundleFileName),
        to: join(paths.appBuild, dllBundleFileName),
      },
    ]),
  ] : [];

  const finalWebpackConfig = {
    node,
    entry: getEntry(config, paths.appDirectory),
    output,
    ...getResolve(config, paths),
    devtool,
    module: {
      rules: [
        ...getFirstRules({ paths, babelOptions }),
        ...getCSSRules('development', { config, paths, cssLoaders, theme }),
        ...getLastRules({ paths, babelOptions }),
      ],
    },
    plugins: [
      new webpack.HotModuleReplacementPlugin(),
      new CaseSensitivePathsPlugin(),
      new WatchMissingNodeModulesPlugin(paths.appNodeModules),
      new SystemBellWebpackPlugin(),
      ...dllPlugins,
      ...getCommonPlugins({
        config,
        paths,
        appBuild: paths.appBuild,
        NODE_ENV: process.env.NODE_ENV,
      }),
    ],
    externals: config.externals,
  };

  if (config.svgSpriteLoaderDirs) {
    baseSvgLoader.exclude = config.svgSpriteLoaderDirs;
    spriteSvgLoader.include = config.svgSpriteLoaderDirs;
    finalWebpackConfig.module.rules.push(baseSvgLoader);
    finalWebpackConfig.module.rules.push(spriteSvgLoader);
  } else {
    finalWebpackConfig.module.rules.push(baseSvgLoader);
  }

  return addExtraBabelIncludes(finalWebpackConfig, paths, config.extraBabelIncludes, babelOptions);
}
