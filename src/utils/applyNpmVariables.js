import getIn from 'lodash.get';
import isPlainObject from 'is-plain-object';


function getPath(str) {
  if (str.indexOf('npm_package_') === 0) {
    return [str.substr(12)];
  }

  if (str.indexOf('npm_config_') === 0) {
    return ['config', ...str.substr(11).split('_')];
  }

  return null;
}

export default function applyNpmVariables(obj, pkg) {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^{}]*)\}/g, (raw, mark) => {
      const path = getPath(mark);
      return path ? getIn(pkg, path, raw) : raw;
    });
  }

  if (Array.isArray(obj)) {
    return obj.map(value => applyNpmVariables(value, pkg));
  }

  if (isPlainObject(obj)) {
    return Object.keys(obj).reduce((memo, key) => {
      memo[key] = applyNpmVariables(obj[key], pkg);
      return memo;
    }, {});
  }

  return obj;
}
