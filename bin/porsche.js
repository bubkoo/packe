#!/usr/bin/env node

/* eslint-disable no-console */
/* eslint-disable global-require */

const os = require('os');
const chalk = require('chalk');
const spawn = require('cross-spawn');


const nodeVersion = process.versions.node;
const versions = nodeVersion.split('.');
const major = versions[0];
const minor = versions[1];
const platform = os.platform();

if (((major * 10) + (minor * 1)) < 65) {
  console.log(chalk.red(`Node version (${major}.${minor}) is not compatibile, ${chalk.cyan('must >= 6.5')}.`));
  console.log();
  if (platform === 'darwin') {
    console.log(`Use ${chalk.cyan('https://github.com/creationix/nvm')} to manage multiple active node.js versions.`);
  } else if (platform === 'win32') {
    console.log(`Link to ${chalk.cyan('https://nodejs.org/')} and download the recommend version.`);
  }
  process.exit(1);
}


const script = process.argv[2];
const args = process.argv.slice(3);

function printHelp() {
  console.log();
  console.log('Usage: porsche [command] [options]');
  console.log();
  console.log('Commands:');
  console.log('  server    Start local development and debugging');
  console.log('  build     Create an optimized production bundle');
  console.log('  buildDll  Create a dll bundle to improve performance');
  console.log('  test      Test your app');
  console.log();
}

switch (script) {
  case '-v':
  case '--version':
    console.log(`v${require('../package.json').version}`);
    break;
  case 'server':
  case 'build':
  case 'buildDll':
  case 'test': {
    const result = spawn.sync(
      'node',
      [require.resolve(`../lib/${script}`)].concat(args),
      { stdio: 'inherit' } // eslint-disable-line
    );
    process.exit(result.status);
    break;
  }
  default:
    if (script) {
      console.log(`Unknown command \`${chalk.red(script)}\``);
    }
    printHelp();
    break;
}
