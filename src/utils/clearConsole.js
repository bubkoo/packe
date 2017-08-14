import clearConsole from 'react-dev-utils/clearConsole';

export default function () {
  if (process.env.CLEAR_CONSOLE !== 'none') {
    clearConsole();
  }
}
