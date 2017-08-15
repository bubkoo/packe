/* eslint-disable no-console */

import chalk from 'chalk';
import getConfig from '../utils/getConfig';

export default function safeGetConfig(paths, env) {
  try {
    return getConfig(paths, env);
  } catch (e) {
    console.log(chalk.red('Failed to parse config file.'));
    console.log();
    console.log(e.message);
    process.exit(1);
  }

  return null;
}
