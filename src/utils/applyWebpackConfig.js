import { existsSync } from 'fs';
import { resolve } from 'path';
import { webpackConfigFileName } from './fileNames';
import './registerBabel';

export default function applyWebpackConfig(config, env) {
  const filePath = resolve(webpackConfigFileName);
  if (existsSync(filePath)) {
    return require(filePath)(config, env);  // eslint-disable-line
  }
  return config;
}
