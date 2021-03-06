import { join } from 'path';
import {
  jsConfigFileName,
  mockConfigFileName,
  webpackConfigFileName,
} from './fileNames';

const cwd = process.cwd();
const files = [
  webpackConfigFileName,
  jsConfigFileName,
  mockConfigFileName,
  join(cwd, 'mock'),
  join(cwd, 'src'),
];

if (process.env.NODE_ENV !== 'test') {
  require('babel-register')({ // eslint-disable-line
    only: new RegExp(`(${files.join('|')})`),
    presets: [
      require.resolve('babel-preset-env'),
      require.resolve('babel-preset-react'),
      require.resolve('babel-preset-stage-0'),
    ],
    plugins: [
      require.resolve('babel-plugin-add-module-exports'),
    ],
    babelrc: false,
  });
}
