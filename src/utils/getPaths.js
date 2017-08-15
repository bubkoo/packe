import { resolve, join } from 'path';
import { realpathSync } from 'fs';
import { dllModulePath, dllManifestFileName } from './fileNames';

function resolveOwn(relativePath) {
  return resolve(__dirname, relativePath);
}

export default function getPaths(cwd) {
  const appDirectory = realpathSync(cwd);

  function resolveApp(relativePath) {
    return resolve(appDirectory, relativePath);
  }

  return {
    cwd,
    resolveApp,
    appDirectory,

    appSrc: resolveApp('src'),
    appBuild: resolveApp('dist'),
    appPublic: resolveApp('public'),
    appBabelCache: resolveApp('node_modules/.cache/babel-loader'),
    appPackageJson: resolveApp('package.json'),
    appNodeModules: resolveApp('node_modules'),
    ownNodeModules: resolveOwn('../../node_modules'),
    dllNodeModule: resolveApp(dllModulePath),
    dllManifest: resolveApp(join(dllModulePath, dllManifestFileName)),
  };
}
