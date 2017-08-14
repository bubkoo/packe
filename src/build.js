/* eslint-disable no-console */
/* eslint-disable global-require */

import fs from 'fs-extra';
import chalk from 'chalk';
import recursive from 'recursive-readdir';
import webpack from 'webpack';
import runArray from './utils/runArray';
import getPaths from './utils/getPaths';
import printErrors from './utils/printErrors';
import printFileSizes from './utils/printFileSizes';
import loadRcConfig from './utils/loadRcConfig';
import getOutputPath from './utils/getOutputPath';
import getFileSizeMap from './utils/getFileSizeMap';
import applyWebpackConfig from './utils/applyWebpackConfig';


process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const argv = require('yargs')
  .usage('Usage: porsche build [options]')
  .option('debug', {
    type: 'boolean',
    describe: 'Build without compress',
    default: false,
  })
  .option('watch', {
    type: 'boolean',
    alias: 'w',
    describe: 'Watch file changes and rebuild',
    default: false,
  })
  .option('output-path', {
    type: 'string',
    alias: 'o',
    describe: 'Specify output path',
    default: null,
  })
  .option('analyze', {
    type: 'boolean',
    describe: 'Visualize and analyze your Webpack bundle.',
    default: false,
  })
  .help('h')
  .argv;

let appBuild;
let rcConfig;
let outputPath;
let finalConfig;


function doneHandler(previousSizeMap, options, resolve, err, stats) {
  if (err) {
    printErrors('Failed to compile.', [err]);
    if (!options.watch) {
      process.exit(1);
    }
    resolve();
    return;
  }

  runArray(stats.stats || stats, (item) => {
    if (item.compilation.errors.length) {
      printErrors('Failed to compile.', item.compilation.errors);
      if (!options.watch) {
        process.exit(1);
      }
    }
  });

  if (stats.stats) {
    console.log(chalk.green('Compiled successfully.'));
  } else {
    console.log(chalk.green(`Compiled successfully in ${(stats.toJson().time / 1000).toFixed(1)}s.`));
    console.log();

    console.log('File sizes after gzip:');
    console.log();
    printFileSizes({ stats, previousSizeMap, appBuild, outputPath });
    console.log();
  }

  if (options.analyze) {
    console.log(`Analyze result is generated at ${chalk.cyan('dist/stats.html')}.`);
    console.log();
  }

  resolve();
}

function innerBuild(previousSizeMap, resolve, options) {
  if (options.debug) {
    console.log('Creating an development build without compress...');
  } else {
    console.log('Creating an optimized production build...');
  }

  const compiler = webpack(finalConfig);
  const done = doneHandler.bind(null, previousSizeMap, options, resolve);
  if (options.watch) {
    compiler.watch(200, done);
  } else {
    compiler.run(done);
  }
}

export default function build(options) {
  const paths = getPaths(options.cwd);

  rcConfig = loadRcConfig(paths, process.env.NODE_ENV);
  outputPath = options.outputPath || getOutputPath(rcConfig) || 'dist';
  appBuild = paths.resolveApp(outputPath);
  finalConfig = runArray(rcConfig, config => applyWebpackConfig(
    require('./preset/webpack.config.prod')(config, paths, appBuild, options),
    process.env.NODE_ENV,
  ));

  return new Promise((resolve) => {
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
