/* eslint-disable no-console */

import chalk from 'chalk';

export default function printErrors(summary, errors, isWarning) {
  if (isWarning) {
    console.log(chalk.red(summary));
  } else {
    console.log(chalk.yellow(summary));
  }
  console.log();
  errors.forEach((err) => {
    console.log(err.message || err);
    console.log();
  });
}
