/* eslint-disable no-console */
/* eslint-disable no-underscore-dangle */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

import fs from 'fs';
import url from 'url';
import { join } from 'path';
import assert from 'assert';
import chalk from 'chalk';
import chokidar from 'chokidar';
import proxy from 'express-http-proxy';
import bodyParser from 'body-parser';
import getPaths from './getPaths';
import winPath from './noamalizePath';
import { mockConfigFileName } from './fileNames';

let error = null;
const paths = getPaths(process.cwd());

export function getConfig(filePath) {
  const fullPath = paths.resolveApp(filePath);
  if (fs.existsSync(fullPath)) {
    const files = [];
    const realRequire = require.extensions['.js'];
    require.extensions['.js'] = (m, filename) => {
      if (filename.indexOf(paths.appNodeModules) === -1) {
        files.push(filename);
      }
      delete require.cache[filename];
      return realRequire(m, filename);
    };

    const config = require(fullPath);
    require.extensions['.js'] = realRequire;

    return { config, files };
  }
  return {
    config: {},
    files: [fullPath],
  };
}

function parseKey(key) {
  let method = 'get';
  let path = key.trim();

  if (path.indexOf(' ') > -1) {
    const splited = path.split(' ');
    method = splited[0].toLowerCase();
    path = splited.slice(1).join('').trim();
  }

  return { method, path };
}

function createMockHandler(method, path, value) {
  return function mockHandler(...args) {
    const res = args[1];
    if (typeof value === 'function') {
      value(...args);
    } else {
      res.json(value);
    }
  };
}

function createProxy(method, path, target) {
  return proxy(target, {
    filter(req) {
      return method ? req.method.toLowerCase() === method.toLowerCase() : true;
    },
    forwardPath(req) {
      let matchPath = req.originalUrl;
      const matches = matchPath.match(path);
      if (matches.length > 1) {
        matchPath = matches[1];
      }
      return join(winPath(url.parse(target).path), matchPath);
    },
  });
}

function innerApplyMock(devServer) {
  const app = devServer.app;
  const { config, files } = getConfig(mockConfigFileName);

  devServer.use(bodyParser.json({ limit: '5mb' }));
  devServer.use(bodyParser.urlencoded({
    extended: true,
    limit: '5mb',
  }));

  Object.keys(config).forEach((key) => {
    const value = config[key];
    const { method, path } = parseKey(key);
    assert(!!app[method], `method of ${key} is not valid`);
    assert(
      typeof value === 'function' ||
      typeof value === 'object' ||
      typeof value === 'string',
      `mock value of ${key} should be function or object or string, but got ${typeof value}`,
    );

    if (typeof value === 'string') {
      const route = /\(.+\)/.test(path)
        ? new RegExp(`^${path}$`)
        : path;

      app.use(
        route,
        createProxy(method, path, value),
      );
    } else {
      app[method](
        path,
        createMockHandler(method, path, value),
      );
    }
  });

  // 调整 stack，把 historyApiFallback 放到最后
  let lastIndex = null;
  app._router.stack.forEach((item, index) => {
    if (item.name === 'webpackDevMiddleware') {
      lastIndex = index;
    }
  });
  const mockAPILength = app._router.stack.length - 1 - lastIndex;
  if (lastIndex && lastIndex > 0) {
    const newStack = app._router.stack;
    newStack.push(newStack[lastIndex - 1]);
    newStack.push(newStack[lastIndex]);
    newStack.splice(lastIndex - 1, 2);
    app._router.stack = newStack;
  }

  const watcher = chokidar.watch(files, {
    ignored: /node_modules/,
    persistent: true,
  });

  watcher.on('change', (path) => {
    console.log(chalk.green('CHANGED '), path.replace(paths.appDirectory, '.'));
    watcher.close();
    // 删除旧的 mock api
    app._router.stack.splice(lastIndex - 1, mockAPILength);

    applyMock(devServer); // eslint-disable-line
  });
}


export function outputError() {
  if (!error) return;

  const filePath = error.message.split(': ')[0];
  const relativeFilePath = filePath.replace(paths.appDirectory, '.');
  const errors = error.stack.split('\n')
    .filter(line => line.trim().indexOf('at ') !== 0)
    .map(line => line.replace(`${filePath}: `, ''));

  errors.splice(1, 0, ['']);

  console.log(chalk.red('Failed to parse mock config.'));
  console.log();
  console.log(`Error in ${relativeFilePath}`);
  console.log(errors.join('\n'));
  console.log();
}

export function applyMock(devServer) {
  const realRequire = require.extensions['.js'];
  try {
    innerApplyMock(devServer);
    error = null;
  } catch (e) {
    // 避免 require mock 文件出错时 100% cpu
    require.extensions['.js'] = realRequire;

    error = e;

    console.log();
    outputError();

    const watcher = chokidar.watch(paths.resolveApp(mockConfigFileName), {
      ignored: /node_modules/,
      persistent: true,
    });

    watcher.on('change', (path) => {
      console.log(chalk.green('CHANGED '), path.replace(paths.appDirectory, '.'));
      watcher.close();
      applyMock(devServer);
    });
  }
}
