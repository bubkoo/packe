/* eslint-disable no-console */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

import fs from 'fs';
import chalk from 'chalk';
import chokidar from 'chokidar';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import openBrowser from 'react-dev-utils/openBrowser';
import { choosePort } from 'react-dev-utils/WebpackDevServerUtils';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import historyApiFallback from 'connect-history-api-fallback';
import getPaths from './utils/getPaths';
import runArray from './utils/runArray';
import * as fileNames from './utils/fileNames';
import printErrors from './utils/printErrors';
import clearConsole from './utils/clearConsole';
import safeGetConfig from './utils/safeGetConfig';
import getPublicPath from './utils/getPublicPath';
import getRelativePath from './utils/getRelativePath';
import printFileChange from './utils/printFileChange';
import applyWebpackConfig from './utils/applyWebpackConfig';
import { applyMock, outputError as printMockError } from './utils/mock';


process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
const host = process.env.HOST || '127.0.0.1';
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
const isInteractive = process.stdout.isTTY;
const cwd = process.cwd();
const paths = getPaths(cwd);


const argv = require('yargs') // eslint-disable-line
  .usage('Usage: porsche server [options]')
  .help('h')
  .argv;

let compiler;
let rcConfig;
let finalConfig;

function setupWatch(devServer) {
  const files = [
    paths.resolveApp(fileNames.rcConfigFileName),
    paths.resolveApp(fileNames.jsConfigFileName),
    paths.resolveApp(fileNames.ymlConfigFileName),
    paths.resolveApp(fileNames.yamlConfigFileName),
    paths.resolveApp(fileNames.webpackConfigFileName),
  ];

  if (typeof rcConfig.theme === 'string') {
    files.push(paths.resolveApp(rcConfig.theme));
  }

  const watcher = chokidar.watch(files, {
    ignored: /node_modules/,
    persistent: true,
  });

  watcher.on('change', (path) => {
    watcher.close();
    devServer.close();
    process.send({
      type: 'RESTART',
      changedFile: getRelativePath(path, paths.appDirectory),
    });
  });
}

function addMiddleware(devServer) {
  devServer.use(historyApiFallback());
  devServer.use(devServer.middleware);
}

function setupCompiler(port) {
  try {
    compiler = webpack(finalConfig);
  } catch (e) {
    console.log(e);
  }

  let changedFile;
  let changedTime;

  function printChange() {
    printFileChange(changedFile, changedTime);
  }

  // after invalidating a watch compile
  compiler.plugin('invalid', (filePath, changeTime) => {
    if (isInteractive) {
      clearConsole();
    }

    changedFile = getRelativePath(filePath, paths.appDirectory);
    changedTime = changeTime;

    printChange();
    console.log('Compiling...');
  });

  let isFirstCompile = true;
  compiler.plugin('done', (stats) => {
    if (isInteractive) {
      clearConsole();
    }

    const json = stats.toJson({}, true);
    const messages = formatWebpackMessages(json);
    const succeed = !messages.errors.length && !messages.warnings.length;
    const showInstructions = succeed && (isInteractive || isFirstCompile);

    printChange();
    if (succeed) {
      console.log(chalk.green(`Compiled successfully in ${(json.time / 1000).toFixed(1)}s!`));
    }

    if (showInstructions) {
      console.log();
      console.log('The app is running at:');
      console.log();
      console.log(`  ${chalk.cyan(`${protocol}://${host}:${port}/`)}`);
      console.log();
      console.log('Note that the development build is not optimized.');
      console.log(`To create a production build, use ${chalk.cyan('npm run build')}.`);
      console.log();
      isFirstCompile = false;
    }

    // If errors exist, only show errors.
    if (messages.errors.length) {
      printErrors('Failed to compile.', messages.errors);
    } else if (messages.warnings.length) {
      printErrors('Compiled with warnings.', messages.warnings);
    }

    if (isInteractive) {
      printMockError();
    }
  });
}

function runDevServer(port) {
  const devServer = new WebpackDevServer(compiler, {
    hot: true,
    quiet: true,
    compress: true,
    disableHostCheck: true,
    clientLogLevel: 'none',
    publicPath: getPublicPath(finalConfig),
    contentBase: paths.appPublic,
    headers: {
      'access-control-allow-origin': '*',
    },
    watchOptions: {
      ignored: /node_modules/,
    },
    https: protocol === 'https',
    host,
    proxy: rcConfig.proxy,
  });

  addMiddleware(devServer);
  applyMock(devServer);

  devServer.listen(port, '0.0.0.0', (err) => {
    if (err) {
      console.log(err);
      process.exit(1);
    }

    process.send({ type: 'READY' });

    if (isInteractive) {
      clearConsole();
    }

    if (argv.restarting && argv.changedFile) {
      console.log(chalk.green(`File "${argv.changedFile}" changed.`));
      console.log(chalk.cyan('Restarting the development server...'));
    } else {
      console.log(chalk.cyan('Starting the development server...'));
    }
    console.log();

    if (isInteractive) {
      printMockError();
    }

    openBrowser(`${protocol}://${host}:${port}/`);
  });

  setupWatch(devServer, port);
}

function init() {
  rcConfig = safeGetConfig(paths, process.env.NODE_ENV);

  if (rcConfig.dllPlugin && !fs.existsSync(paths.dllManifest)) {
    console.log(chalk.red('Failed to start the server, since you have enabled dllPlugin, \nyou should run `porsche buildDll` before `porsche server`.'));
    process.exit(1);
  }

  finalConfig = runArray(rcConfig, config => applyWebpackConfig(
    require('./preset/webpack.config.dev')(config, paths),
    process.env.NODE_ENV,
  ));

  choosePort(host, DEFAULT_PORT).then((port) => {
    if (port === null) {
      return;
    }

    try {
      setupCompiler(port);
      runDevServer(port);
    } catch (e) {
      console.log(e);
    }
  });
}

init();
