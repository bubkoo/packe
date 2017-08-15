import webpack from 'webpack';
import { join } from 'path';
import pullAll from 'lodash.pullall';
import uniq from 'lodash.uniq';
import { baseName } from '../utils/fileNames';

export default function (rcConfig, paths) {
  const pkg = require(join(paths.appDirectory, 'package.json')); // eslint-disable-line
  const appBuild = paths.dllNodeModule;
  const { include, exclude } = rcConfig.dllPlugin || {};
  const dependencyNames = Object.keys(pkg.dependencies);
  // distinct includes
  const includeDependencies = uniq(dependencyNames.concat(include || []));

  return {
    entry: {
      [baseName]: pullAll(includeDependencies, exclude),
    },
    output: {
      path: appBuild,
      filename: '[name].dll.js',
      library: '[name]',
    },
    plugins: [
      new webpack.DllPlugin({
        path: join(appBuild, '[name].json'),
        name: '[name]',
        context: paths.appSrc,
      }),
    ],
    resolve: {
      modules: [
        paths.appDirectory,
        'node_modules',
        paths.ownNodeModules,
      ],
    },
  };
}
