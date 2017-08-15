import { fork } from 'child_process';

function start(restart) {
  const args = process.argv.slice(2);
  if (restart) {
    args.push('--restarting');
    args.push(`--changedFile=${restart.changedFile}`);
  }

  const child = fork(`${__dirname}/server`, args);
  child.on('message', ({ type, changedFile }) => {
    if (type === 'RESTART') {
      child.kill('SIGINT');
      start({ changedFile });
    }
  });
}

if (!process.send) {
  start();
} else {
  require('./runServer'); // eslint-disable-line
}
