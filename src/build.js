/* eslint-disable no-console */
/* eslint-disable global-require */

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import filesize from 'filesize';
import { sync as gzipSize } from 'gzip-size';
import recursive from 'recursive-readdir';
import stripAnsi from 'strip-ansi';
import padRight from 'lodash.padright';
import webpack from 'webpack';
import readFile from './utils/readFile';
import runArray from './utils/runArray';
import getPaths from './utils/getPaths';
import getConfig from './utils/getConfig';
import applyWebpackConfig from './utils/applyWebpackConfig';


process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const argv = require('yargs')
  .usage('Usage: packe build [options]')
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

function getOutputPath(config) {
  if (Array.isArray(config)) {
    return config[0].outputPath;
  }
  return config.outputPath;
}

// /User/dan/app/build/static/js/main.82be8.js => /static/js/main.js
function removeFileNameHash(fileName) {
  return fileName
    .replace(appBuild, '')
    .replace(/\/?(.*)(\.\w+)(\.js|\.css)/, (match, p1, p2, p3) => p1 + p3);
}

function printErrors(summary, errors) {
  console.log(chalk.red(summary));
  console.log();
  errors.forEach((err) => {
    console.log(err.message || err);
    console.log();
  });
}

// 1024, 2048 => "(+1 KB)"
function getDifferenceLabel(currentSize, previousSize) {
  const FIFTY_KILOBYTES = 1024 * 50;
  const difference = currentSize - previousSize;
  const fileSize = !Number.isNaN(difference) ? filesize(difference) : 0;
  if (difference >= FIFTY_KILOBYTES) {
    return chalk.red(`+${fileSize}`);
  } else if (difference < FIFTY_KILOBYTES && difference > 0) {
    return chalk.yellow(`+${fileSize}`);
  } else if (difference < 0) {
    return chalk.green(fileSize);
  }
  return '';
}

function printFileSizes(stats, previousSizeMap) {
  const assets = stats.toJson().assets
    .filter(asset => /\.(js|css)$/.test(asset.name))
    .map((asset) => {
      const content = readFile(`${appBuild}/${asset.name}`);
      const size = gzipSize(content);
      const previousSize = previousSizeMap[removeFileNameHash(asset.name)];
      const difference = getDifferenceLabel(size, previousSize);
      return {
        size,
        name: path.basename(asset.name),
        folder: path.join(outputPath, path.dirname(asset.name)),
        sizeLabel: filesize(size) + (difference ? ` (${difference})` : ''),
      };
    });

  assets.sort((a, b) => b.size - a.size);

  const maxLength = Math.max.apply(
    null,
    assets.map(a => stripAnsi(a.sizeLabel).length),
  );

  assets.forEach((asset) => {
    const length = stripAnsi(asset.sizeLabel).length;
    const sizeLabel = length < maxLength
      ? padRight(asset.sizeLabel, maxLength - length, ' ')
      : asset.sizeLabel;

    console.log(`  ${sizeLabel}  ${chalk.dim(asset.folder + path.sep)}${chalk.cyan(asset.name)}`);
  });
}

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
    printFileSizes(stats, previousSizeMap);
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

export default function build() {
  const paths = getPaths(argv.cwd);

  try {
    rcConfig = getConfig(paths, process.env.NODE_ENV);
  } catch (e) {
    console.log(chalk.red('Failed to parse config file.'));
    console.log();
    console.log(e.message);
    process.exit(1);
  }

  outputPath = argv.outputPath || getOutputPath(rcConfig) || 'dist';
  appBuild = paths.resolveApp(outputPath);

  finalConfig = runArray(rcConfig, config => applyWebpackConfig(
    require('./preset/webpack.config.prod')(config, paths, appBuild, argv),
    process.env.NODE_ENV,
  ));

  return new Promise((resolve) => {
    // First, read the current file sizes in build directory.
    // This lets us display how much they changed later.
    recursive(appBuild, (err, fileNames) => {
      const previousSizeMap = (fileNames || [])
        .filter(fileName => /\.(js|css)$/.test(fileName))
        .reduce((memo, fileName) => {
          const contents = fs.readFileSync(fileName);
          const key = removeFileNameHash(fileName);
          memo[key] = gzipSize(contents);
          return memo;
        }, {});

      // Remove all content but keep the directory so that
      // if you're in it, you don't end up in Trash
      fs.emptyDirSync(appBuild);

      // Start the webpack build
      innerBuild(previousSizeMap, resolve, argv);
    });
  });
}

if (require.main === module) {
  build({ ...argv, cwd: process.cwd() });
}
