import { join } from 'path';

const cwd = process.cwd();
const files = [
  'webpack.config.js',
  '.porsche.js',
  '.porsche.mock.js',
  join(cwd, 'mock'),
  join(cwd, 'src'),
];

if (process.env.NODE_ENV !== 'test') {
  require('babel-register')({ // eslint-disable-line
    only: new RegExp(`(${files.join('|')})`),
    presets: [
      require.resolve('babel-preset-es2015'),
      require.resolve('babel-preset-react'),
      require.resolve('babel-preset-stage-0'),
    ],
    plugins: [
      require.resolve('babel-plugin-add-module-exports'),
    ],
    babelrc: false,
  });
}
