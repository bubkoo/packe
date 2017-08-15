/* eslint-disable no-console */

import chalk from 'chalk';
import moment from 'moment';

export default function printFileChange(fileName, time = Date.now()) {
  if (fileName) {
    console.log(`${chalk.dim(moment(time).format('YYYY-MM-DD HH:mm:ss'))}  ${chalk.cyan(fileName)} ${chalk.dim('changed.')}`);
  }
}
