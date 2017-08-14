/* eslint-disable no-console */

import { existsSync } from 'fs';
import chalk from 'chalk';
import yaml from 'js-yaml';
import stripJson from 'strip-json-comments';
import parseJSON from 'parse-json-pretty';
import readFile from './readFile';


export default function parseConfig(paths) {
  const { resolveApp } = paths;

  const rcFilename = '.packerc';
  const jsFilename = `${rcFilename}.js`;
  const ymlFilename = `${rcFilename}.yml`;
  const yamlFilename = `${rcFilename}.yaml`;

  const rcFilepath = resolveApp(rcFilename);
  const jsFilepath = resolveApp(jsFilename);
  const ymlFilepath = resolveApp(ymlFilename);
  const yamlFilepath = resolveApp(yamlFilename);

  const rcFileExists = existsSync(rcFilepath);
  const jsFileExists = existsSync(jsFilepath);
  const ymlFileExists = existsSync(ymlFilepath);
  const yamlFileExists = existsSync(yamlFilepath);

  if (process.env.NODE_ENV === 'development') {
    const exists = [
      [jsFilename, jsFileExists],
      [rcFilename, rcFileExists],
      [ymlFilename, ymlFileExists],
      [yamlFilename, yamlFileExists],
    ].filter(item => item[1]);

    if (exists.length > 1) {
      const filenames = exists.map(item => `"${item[0]}"`);
      console.log(chalk.yellow(`Warning: Multiple config files: ${filenames.join(', ')}.`));
      console.log(chalk.yellow(`Only ${filenames[0]} will be applied.`));
      console.log();
    }
  }

  if (jsFileExists) {
    return require(jsFilepath); // eslint-disable-line
  }

  if (rcFileExists) {
    return parseJSON(stripJson(readFile(rcFilepath)), rcFilename);
  }

  if (ymlFileExists) {
    return yaml.safeLoad(readFile(ymlFilepath), { filename: ymlFilename });
  }

  if (yamlFileExists) {
    return yaml.safeLoad(readFile(yamlFilepath), { filename: yamlFilename });
  }

  return {};
}
