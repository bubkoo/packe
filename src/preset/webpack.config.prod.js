import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import Visualizer from 'webpack-visualizer-plugin';
import getEntry from '../utils/getEntry';
import getTheme from '../utils/getTheme';
import getCSSLoaders from '../utils/getCSSLoaders';
import {
  node,
  defaultDevtool,
  baseSvgLoader,
  spriteSvgLoader,

  getBabelOptions,
  getResolve,
  getFirstRules,
  getCSSRules,
  getLastRules,
  getCommonPlugins,
  addExtraBabelIncludes,
} from './common';


export default function (config, paths, distPath, options) {
  const { watch, debug, analyze } = options;
  const NODE_ENV = debug ? 'development' : process.env.NODE_ENV;

  const {
    publicPath = '/',
    library = null,
    libraryTarget = 'var',
    devtool = debug ? defaultDevtool : false,
  } = config;

  const babelOptions = getBabelOptions(config);
  const cssLoaders = getCSSLoaders(config);
  const theme = getTheme(paths.cwd, config);
  // hash
  const name = config.hash ? '[name].[chunkhash]' : '[name]';
  const output = {
    path: distPath,
    filename: `${name}.js`,
    publicPath,
    libraryTarget,
    chunkFilename: `${name}.async.js`,
  };

  if (library) {
    output.library = library;
  }

  const finalWebpackConfig = {
    bail: true, // Report the first error as a hard error instead of tolerating it.
    node,
    entry: getEntry(config, paths.appDirectory, true),
    output,
    devtool,
    ...getResolve(config, paths),
    module: {
      rules: [
        ...getFirstRules({ paths, babelOptions }),
        ...getCSSRules('production', { config, paths, cssLoaders, theme }),
        ...getLastRules({ paths, babelOptions }),
      ],
    },
    plugins: [
      ...(watch ? [] : [
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.optimize.DedupePlugin(),
      ]),
      new ExtractTextPlugin(`${name}.css`),
      ...getCommonPlugins({ config, paths, distPath, NODE_ENV }),
      ...(debug ? [] : [new webpack.optimize.UglifyJsPlugin({
        compress: {
          screw_ie8: true, // React doesn't support IE8
          warnings: false,
        },
        mangle: {
          screw_ie8: true,
        },
        output: {
          comments: false,
          screw_ie8: true,
          ascii_only: true,
        },
      })]),
      ...(analyze ? [new Visualizer()] : []),
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
