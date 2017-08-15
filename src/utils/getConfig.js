/* eslint-disable no-console */

import { existsSync } from 'fs';
import chalk from 'chalk';
import yaml from 'js-yaml';
import stripJson from 'strip-json-comments';
import parseJSON from 'parse-json-pretty';
import isPlainObject from 'is-plain-object';
import readFile from './readFile';
import * as fileNames from './fileNames';
import applyNpmVariables from './applyNpmVariables';

require('./registerBabel');


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

function parseConfig(paths) {
  const { resolveApp } = paths;
  const { rcConfigFileName,
    jsConfigFileName,
    ymlConfigFileName,
    yamlConfigFileName,
  } = fileNames;

  const rcConfigFilePath = resolveApp(rcConfigFileName);
  const jsConfigFilePath = resolveApp(jsConfigFileName);
  const ymlConfigFilePath = resolveApp(ymlConfigFileName);
  const yamlConfigFilePath = resolveApp(yamlConfigFileName);

  const rcConfigFileExists = existsSync(rcConfigFilePath);
  const jsConfigFileExists = existsSync(jsConfigFilePath);
  const ymlConfigFileExists = existsSync(ymlConfigFilePath);
  const yamlConfigFileExists = existsSync(yamlConfigFilePath);

  if (process.env.NODE_ENV === 'development') {
    const exists = [
      [jsConfigFileName, jsConfigFileExists],
      [rcConfigFileName, rcConfigFileExists],
      [ymlConfigFileName, ymlConfigFileExists],
      [yamlConfigFileName, yamlConfigFileExists],
    ].filter(item => item[1]);

    if (exists.length > 1) {
      const names = exists.map(item => `"${item[0]}"`);
      console.log(chalk.yellow(`Warning: Multiple config files: ${names.join(', ')}.`));
      console.log(chalk.yellow(`Only ${names[0]} will be applied.`));
      console.log();
    }
  }

  if (jsConfigFileExists) {
    return require(jsConfigFilePath); // eslint-disable-line
  }

  if (rcConfigFileExists) {
    return parseJSON(stripJson(readFile(rcConfigFilePath)), rcConfigFileName);
  }

  if (ymlConfigFileExists) {
    return yaml.safeLoad(readFile(ymlConfigFilePath), { filename: ymlConfigFileName });
  }

  if (yamlConfigFileExists) {
    return yaml.safeLoad(readFile(yamlConfigFilePath), { filename: yamlConfigFileName });
  }

  return {};
}

export default function getConfig(paths, env = 'development') {
  const pkg = JSON.parse(readFile(paths.appPackageJson));
  const config = parseConfig(paths);

  if (Array.isArray(config)) {
    return config.map(c => normalize(c, env, pkg));
  }

  return normalize(config, env, pkg);
}
