import isPlainObject from 'is-plain-object';
import readFile from './readFile';
import parseConfig from './parseConfig';
import applyNpmVariables from './applyNpmVariables';
import './registerBabel';


function mergeEnv(target, source) {
  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      target[key] = targetValue.concat(sourceValue);
    } else if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      target[key] = { ...targetValue, ...sourceValue };
    } else {
      target[key] = sourceValue;
    }
  });
}

function normalize(config, env, pkg) {
  if (config.env) {
    if (config.env[env]) {
      mergeEnv(config, config.env[env]);
    }
    delete config.env;
  }

  return applyNpmVariables(config, pkg);
}

export default function getConfig(paths, env = 'development') {
  const pkg = JSON.parse(readFile(paths.appPackageJson));
  const config = parseConfig(paths);

  if (Array.isArray(config)) {
    return config.map(c => normalize(c, env, pkg));
  }

  return normalize(config, env, pkg);
}
