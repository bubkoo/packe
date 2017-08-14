/* eslint-disable no-console */

import { existsSync } from 'fs';
import chalk from 'chalk';
import yaml from 'js-yaml';
import stripJson from 'strip-json-comments';
import parseJSON from 'parse-json-pretty';
import * as fileNames from './fileNames';
import readFile from './readFile';

require('./registerBabel');


export default function parseConfig(paths) {
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
