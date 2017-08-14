/* eslint-disable no-console */
/* eslint-disable global-require */

import fs from 'fs-extra';
import chalk from 'chalk';
import rimraf from 'rimraf';
import recursive from 'recursive-readdir';
import webpack from 'webpack';
import getPaths from './utils/getPaths';
import loadRcConfig from './utils/loadRcConfig';
import printErrors from './utils/printErrors';
import printFileSizes from './utils/printFileSizes';
import getFileSizeMap from './utils/getFileSizeMap';
import applyWebpackConfig from './utils/applyWebpackConfig';


process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const argv = require('yargs')
  .usage('Usage: prosche buildDll [options]')
  .help('h')
  .argv;

let rcConfig;
let appBuild;
let finalConfig;


function doneHandler(previousSizeMap, options, resolve, err, stats) {
  if (err) {
    printErrors('Failed to compile.', [err]);
    process.exit(1);
  }

  if (stats.compilation.errors.length) {
    printErrors('Failed to compile.', stats.compilation.errors);
    process.exit(1);
  }

  console.log(chalk.green(`Compiled successfully in ${(stats.toJson().time / 1000).toFixed(1)}s.`));
  console.log();

  console.log('File sizes after gzip:');
  console.log();
  printFileSizes(stats, previousSizeMap);
  console.log();

  resolve();
}

function innerBuild(previousSizeMap, resolve, options) {
  console.log('Creating dll bundle...');

  const compiler = webpack(finalConfig);
  const done = doneHandler.bind(null, previousSizeMap, options, resolve);
  compiler.run(done);
}

export default function build(options) {
  const paths = getPaths(options.cwd);
  rcConfig = loadRcConfig(paths, process.env.NODE_ENV);

  if (!rcConfig.dllPlugin) {
    console.log(chalk.red('`dllPlugin` donot specified in config file.'));
    process.exit(1);
  }

  appBuild = paths.dllNodeModule;
  finalConfig = applyWebpackConfig(
    require('./preset/webpack.config.dll')(rcConfig, paths, options),
    process.env.NODE_ENV,
  );

  return new Promise((resolve) => {
    // clear babel cache directory
    rimraf.sync(paths.appBabelCache);

    recursive(appBuild, (err, filePaths) => {
      const previousSizeMap = getFileSizeMap(filePaths);
      fs.emptyDirSync(appBuild);
      innerBuild(previousSizeMap, resolve, options);
    });
  });
}


if (require.main === module) {
  build({ ...argv, cwd: process.cwd() });
}
