import { join } from 'path';
import webpack from 'webpack';
import uniq from 'lodash.uniq';
import pullAll from 'lodash.pullall';
import isPlainObject from 'is-plain-object';
import { baseName } from '../utils/fileNames';


export default function (rcConfig, paths) {
  const pkg = require(join(paths.appDirectory, 'package.json')); // eslint-disable-line
  const { dllPlugin } = rcConfig;
  const { include, exclude } = isPlainObject(dllPlugin) ? dllPlugin : {};
  const dependencyNames = Object.keys(pkg.dependencies);
  const includeDependencies = uniq(dependencyNames.concat(include || []));
  const appBuild = paths.dllNodeModule;

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
        path: join(appBuild, '[name].manifest.json'),
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
