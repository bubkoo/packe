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
import printErrors from './utils/printErrors';
import clearConsole from './utils/clearConsole';
import applyWebpackConfig from './utils/applyWebpackConfig';
import { applyMock, outputError as outputMockError } from './utils/mock';
import loadRcConfig from './utils/loadRcConfig';
import getPublicPath from './utils/getPublicPath';


process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
const host = process.env.HOST || '0.0.0.0';
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
const isInteractive = process.stdout.isTTY;
const cwd = process.cwd();
const paths = getPaths(cwd);


require('yargs') // eslint-disable-line
  .usage('Usage: porsche server [options]')
  .help('h')
  .argv;

let compiler;
let rcConfig;
let finalConfig;

function setupWatch(devServer) {
  const files = [
    paths.resolveApp('.porshcerc'),
    paths.resolveApp('.porshcerc.js'),
    paths.resolveApp('.porshcerc.yml'),
    paths.resolveApp('.porshcerc.yaml'),
    paths.resolveApp('webpack.config.js'),
  ];

  if (typeof rcConfig.theme === 'string') {
    files.push(paths.resolveApp(rcConfig.theme));
  }

  const watcher = chokidar.watch(files, {
    ignored: /node_modules/,
    persistent: true,
  });

  watcher.on('change', (path) => {
    console.log(chalk.green(`File ${path.replace(paths.appDirectory, '.')} changed, try to restart server.`));
    watcher.close();
    devServer.close();
    process.send('RESTART');
  });
}

function addMiddleware(devServer) {
  const proxy = require(paths.appPackageJson).proxy;
  devServer.use(historyApiFallback({
    disableDotRule: true,
    htmlAcceptHeaders: proxy ?
      ['text/html'] :
      ['text/html', '*/*'],
  }));
  // TODO: proxy index.html, ...
  devServer.use(devServer.middleware);
}

function setupCompiler(port) {
  try {
    compiler = webpack(finalConfig);
  } catch (e) {
    console.log(e);
  }

  compiler.plugin('invalid', () => {
    if (isInteractive) {
      clearConsole();
    }
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

    if (succeed) {
      if (stats.stats) {
        console.log(chalk.green('Compiled successfully'));
      } else {
        console.log(chalk.green(`Compiled successfully in ${(json.time / 1000).toFixed(1)}s!`));
      }
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
      // Show some ESLint tricks.
      console.log('You may use special comments to disable some warnings.');
      console.log(`Use ${chalk.yellow('// eslint-disable-next-line')} to ignore the next line.`);
      console.log(`Use ${chalk.yellow('/* eslint-disable */')} to ignore all warnings in a file.`);
      console.log();
    }

    if (isInteractive) {
      outputMockError();
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

    process.send('READY');

    if (isInteractive) {
      clearConsole();
    }
    console.log(chalk.cyan('Starting the development server...'));
    console.log();
    if (isInteractive) {
      outputMockError();
    }

    openBrowser(`${protocol}://${host}:${port}/`);
  });

  setupWatch(devServer, port);
}

function init() {
  rcConfig = loadRcConfig(paths, process.env.NODE_ENV);

  if (rcConfig.dllPlugin && !fs.existsSync(paths.dllManifest)) {
    console.log(chalk.red('Failed to start the server, since you have enabled dllPlugin, you should run `porsche buildDll` before `porsche server`.'));
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
